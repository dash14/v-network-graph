import type { Simulation } from "d3-force"
import { describe, expect, onTestFinished, test, vi } from "vitest"
import { userEvent } from "vitest/browser"
import { h, nextTick } from "vue"
import type { Slots } from "vue"
import type {
  Edges,
  Layers,
  LiteUserConfigs,
  NodeLabelDirectionAutoAdjustmentHandler,
  Position,
  UserConfigs,
  VNetworkGraphLiteInstance,
} from "@/index"
import { ForceLayout } from "@/layouts/force"
import type { ForceEdgeDatum, ForceNodeDatum } from "@/layouts/force"
import { POLL_INTERVAL } from "./helpers/container"
import { at, drag, elementAt, mountGraph, payloadsOf } from "./helpers/graph"

const nodes = {
  node1: { name: "Node 1" },
  node2: { name: "Node 2" },
  node3: { name: "Node 3" },
}
const edges: Edges = {
  edge1: { source: "node1", target: "node2" },
  edge2: { source: "node2", target: "node3" },
}
const layouts = {
  nodes: {
    node1: { x: -200, y: 0 },
    node2: { x: 0, y: 0 },
    node3: { x: 200, y: 0 },
  },
}

async function mountLite(
  props: {
    edges?: Edges
    configs?: LiteUserConfigs
    selectedNodes?: string[]
    layers?: Layers
  },
  slots: Slots = {}
) {
  const mounted = await mountGraph(
    { nodes, edges, layouts, ...props, configs: props.configs as UserConfigs },
    { lite: true, slots }
  )
  return { ...mounted, graph: mounted.graph as unknown as VNetworkGraphLiteInstance }
}

const attributes = (element: Element | null | undefined, names: string[]) =>
  Object.fromEntries(names.map(n => [n, element?.getAttribute(n)]))

describe("drawing", () => {
  test("draws a node as a shape, a label as a text in a group and an edge as a line", async () => {
    const { screen } = await mountLite({
      configs: { node: { normal: { type: node => (node.name === "Node 3" ? "rect" : "circle") } } },
    })
    const c = screen.container

    const shapes = [...c.querySelectorAll(".v-ng-layer-nodes > .v-ng-node")]
    expect(shapes.map(e => e.localName)).toEqual(["circle", "circle", "rect"])
    expect(shapes.map(e => e.getAttribute("transform"))).toEqual([
      "translate(-200 0)",
      "translate(0 0)",
      "translate(200 0)",
    ])
    // Around the origin, as the shape itself is moved.
    expect(attributes(shapes[0], ["cx", "cy"])).toEqual({ cx: "0", cy: "0" })
    expect(Number(shapes[2].getAttribute("x"))).toBeLessThan(0)

    const labels = [...c.querySelectorAll(".v-ng-layer-node-labels > g > text.v-ng-node-label")]
    expect(labels.map(e => e.textContent?.trim())).toEqual(["Node 1", "Node 2", "Node 3"])
    expect(labels[0].parentElement!.getAttribute("transform")).toBe("translate(-200 0)")
    expect(labels[0].getAttribute("transform")).toBeNull()
    // Below the node, by default.
    expect(Number(labels[0].getAttribute("y"))).toBeGreaterThan(0)

    const lines = [...c.querySelectorAll(".v-ng-layer-edges > line.v-ng-edge")]
    expect(lines.map(e => e.getAttribute("data-edge-id"))).toEqual(["edge1", "edge2"])
    expect(attributes(lines[0], ["x1", "y1", "x2", "y2"])).toEqual({
      x1: "-200",
      y1: "0",
      x2: "0",
      y2: "0",
    })
    expect(c.querySelector(".v-ng-layer-nodes g, .v-ng-layer-edges g")).toBeNull()
  })

  test("leaves out a self-loop", async () => {
    const { screen } = await mountLite({
      edges: { ...edges, loop: { source: "node1", target: "node1" } },
    })
    const ids = [...screen.container.querySelectorAll(".v-ng-edge")].map(e =>
      e.getAttribute("data-edge-id")
    )
    expect(ids).toEqual(["edge1", "edge2"])
  })

  test("draws edges between the same nodes apart, rather than summarizing them", async () => {
    const { screen } = await mountLite({
      edges: { ...edges, edge3: { source: "node1", target: "node2" } },
    })
    const ys = ["edge1", "edge3"].map(id =>
      screen.container.querySelector(`[data-edge-id="${id}"]`)?.getAttribute("y1")
    )
    expect(ys[0]).not.toBeNull()
    expect(ys[0]).not.toBe(ys[1])
    expect(screen.container.querySelector(".v-ng-edge-summarized")).toBeNull()
  })

  test("ends an edge with a marker at the edge of the node", async () => {
    const { screen } = await mountLite({
      configs: { edge: { marker: { target: { type: "arrow" } } } },
    })
    const line = screen.container.querySelector('[data-edge-id="edge1"]')
    expect(line?.getAttribute("marker-end")).toMatch(/^url\('#.+'\)$/)
    expect(Number(line?.getAttribute("x2"))).toBeLessThan(-16)
  })

  test("gives the function adjusting a label copies of the positions", async () => {
    const given: Position[] = []
    const adjust: NodeLabelDirectionAutoAdjustmentHandler = ({ pos, oppositeNodes }) => {
      given.push(pos, ...Object.values(oppositeNodes).map(n => n.pos))
      return null
    }
    // Returned by a function, as a function given in the configs is called with the node.
    const { state } = await mountLite({
      configs: { node: { label: { directionAutoAdjustment: () => adjust } } },
    })
    expect(given.length).toBeGreaterThan(0)

    given.forEach(p => (p.x = 999))

    expect(Object.values(state.layouts.nodes).map(p => p.x)).toEqual([-200, 0, 200])
  })

  test("exports the graph as SVG", async () => {
    const { graph } = await mountLite({})
    const svg = await graph.exportAsSvgText()
    expect(svg).toContain("<line")
    expect(svg).toContain("<circle")
  })
})

describe("what a lite graph does not support", () => {
  const spyWarn = () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    onTestFinished(() => warn.mockRestore())
    return warn
  }

  test("ignores the VNetworkGraph-only slots with a warning", async () => {
    const warn = spyWarn()
    const { screen } = await mountLite(
      // Listed as a layer too, which must not draw it either.
      { layers: { "edge-label": "base" } },
      {
        "override-node": () => h("text", { class: "unsupported" }),
        "edge-label": () => h("text", { class: "unsupported" }),
      }
    )
    expect(screen.container.querySelector(".unsupported")).toBeNull()
    expect(warn.mock.calls.flat().join(" ")).toContain("#override-node, #edge-label")
  })

  test("draws other slots as layers with no warning", async () => {
    const warn = spyWarn()
    const { screen } = await mountLite({}, { custom: () => h("text", { class: "custom" }) })
    expect(screen.container.querySelector(".custom")).not.toBeNull()
    expect(warn).not.toHaveBeenCalled()
  })
})

describe("interactions", () => {
  const configs = { node: { selectable: true }, edge: { selectable: true } }

  test("clicking a node or an edge selects it", async () => {
    const { canvas, state } = await mountLite({ configs })

    await userEvent.click(canvas, { position: at(-200, 0) })
    expect(state.selectedNodes).toEqual(["node1"])

    await userEvent.click(canvas, { position: at(-100, 0) })
    expect(state.selectedEdges).toEqual(["edge1"])
  })

  test("an edge is hit by its own line, and not beside it", async () => {
    const { screen, canvas, events } = await mountLite({ configs })

    expect(elementAt(screen.container, at(-100, 0))?.getAttribute("data-edge-id")).toBe("edge1")
    await userEvent.hover(canvas, { position: at(-100, 0) })
    expect(payloadsOf(events, "edge:pointerover")).toMatchObject([{ edge: "edge1" }])
    expect(elementAt(screen.container, at(-100, 6))?.closest(".v-ng-edge")).toBeNull()
  })

  test("dragging a node moves it and updates the layouts", async () => {
    const { screen, canvas, state } = await mountLite({})

    await drag(canvas, at(-200, 0), at(-150, 30))
    expect(state.layouts.nodes.node1).toEqual({ x: -150, y: 30 })
    const line = screen.container.querySelector('[data-edge-id="edge1"]')
    expect(attributes(line, ["x1", "y1"])).toEqual({ x1: "-150", y1: "30" })
  })
})

describe("force layout", () => {
  // Settles within a few dozen ticks.
  const layoutHandler = () =>
    new ForceLayout({
      createSimulation: (d3, nodes, edges) =>
        d3
          .forceSimulation(nodes)
          .force(
            "edge",
            d3.forceLink(edges).id((d: any) => d.id)
          )
          .force("charge", d3.forceManyBody())
          .alphaDecay(0.2),
    })
  // Drawn ahead as numbers, which the attributes read back with 6 significant digits.
  const isNearValue = (a: number, b: number) =>
    Math.abs(a - b) <= 1e-5 * Math.max(Math.abs(a), Math.abs(b), 1e-3)
  const isNear = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    isNearValue(a.x, b.x) && isNearValue(a.y, b.y)
  const drawnPosition = (container: Element, id: string) => {
    const index = Object.keys(nodes).indexOf(id)
    const node = container.querySelectorAll(".v-ng-node")[index]
    const [, x, y] = /translate\((\S+) (\S+)\)/.exec(node.getAttribute("transform")!)!
    return { x: Number(x), y: Number(y) }
  }

  test("draws the ticks ahead of the layouts, and updates them when the simulation ends", async () => {
    const { screen, state } = await mountLite({
      configs: { view: { layoutHandler: layoutHandler(), layoutsUpdateInterval: 60000 } },
    })

    // Ahead of the layouts while the simulation runs.
    await vi.waitUntil(
      () => !isNear(state.layouts.nodes.node1, drawnPosition(screen.container, "node1")),
      { timeout: 5000, interval: POLL_INTERVAL }
    )
    // The edges follow the nodes drawn ahead, between their centers with no marker or margin.
    const line = screen.container.querySelector('[data-edge-id="edge1"]')
    const end = { x: Number(line?.getAttribute("x1")), y: Number(line?.getAttribute("y1")) }
    expect(isNear(end, drawnPosition(screen.container, "node1"))).toBe(true)

    // Caught up when it ends.
    await vi.waitUntil(
      () => isNear(state.layouts.nodes.node1, drawnPosition(screen.container, "node1")),
      { timeout: 10000, interval: POLL_INTERVAL }
    )
  })

  test("getLayouts() returns the positions drawn, while the layouts lag behind", async () => {
    const { screen, state, graph } = await mountLite({
      configs: { view: { layoutHandler: layoutHandler(), layoutsUpdateInterval: 60000 } },
    })
    await vi.waitUntil(
      () => {
        const p = state.layouts.nodes.node2
        const d = drawnPosition(screen.container, "node2")
        return Math.hypot(p.x - d.x, p.y - d.y) > 1
      },
      { timeout: 5000, interval: POLL_INTERVAL }
    )

    expect(isNear(graph.getLayouts().nodes.node2, drawnPosition(screen.container, "node2"))).toBe(
      true
    )
  })

  test("writes nothing again when the layouts catch up with the positions drawn", async () => {
    const { screen, state, graph } = await mountLite({
      configs: { view: { layoutHandler: layoutHandler(), layoutsUpdateInterval: 60000 } },
    })
    await vi.waitUntil(
      () => !isNear(state.layouts.nodes.node2, drawnPosition(screen.container, "node2")),
      { timeout: 5000, interval: POLL_INTERVAL }
    )

    const records: MutationRecord[] = []
    const observer = new MutationObserver(r => records.push(...r))
    observer.observe(screen.container, {
      subtree: true,
      attributeFilter: ["transform", "x1", "y1", "x2", "y2"],
    })
    // No tick comes before the writes that follow the layouts, as they are in the same task.
    graph.getLayouts()
    await nextTick()
    records.push(...observer.takeRecords())
    observer.disconnect()
    expect(isNear(state.layouts.nodes.node2, drawnPosition(screen.container, "node2"))).toBe(true)
    expect(records).toEqual([])
  })

  describe("reading the positions drawn ahead of the layouts", () => {
    // Stopped, so that a node is drawn only where the test moves it.
    const mountStopped = async (configs: LiteUserConfigs = {}, positionFixedByDrag = false) => {
      let simulation: Simulation<ForceNodeDatum, ForceEdgeDatum> | undefined
      const layoutHandler = new ForceLayout({
        positionFixedByDrag,
        createSimulation: (d3, nodes, edges) =>
          (simulation = d3
            .forceSimulation(nodes)
            .force(
              "edge",
              d3.forceLink<ForceNodeDatum, ForceEdgeDatum>(edges).id(d => d.id)
            )
            .stop()),
      })
      const mounted = await mountLite({
        configs: {
          ...configs,
          view: { layoutHandler, layoutsUpdateInterval: 60000 },
          node: { selectable: true, ...configs.node },
        },
      })
      const moveTo = (id: string, x: number, y: number, draw = true) => {
        Object.assign(
          simulation!.nodes().find(n => n.id === id)!,
          { x, y }
        )
        if (draw) layoutHandler.ticked()
      }
      return { ...mounted, moveTo }
    }

    test("a drag starts from where the node is drawn", async () => {
      // Fixed where it is dropped, so that the simulation leaves it there.
      const { canvas, graph, moveTo } = await mountStopped({}, true)
      moveTo("node1", 100, 100)

      await drag(canvas, at(100, 100), at(150, 130))

      expect(graph.getLayouts().nodes.node1).toMatchObject({ x: 150, y: 130 })
    })

    test("a node moving less than 0.2 pixels is drawn once its moves add up, with its edges", async () => {
      const { screen, graph, moveTo } = await mountStopped()
      const line = screen.container.querySelector('[data-edge-id="edge1"]')!
      const drawn = () => ({
        node: drawnPosition(screen.container, "node1"),
        edge: { x: Number(line.getAttribute("x1")), y: Number(line.getAttribute("y1")) },
      })
      moveTo("node1", 100, 100)

      moveTo("node1", 100.15, 100)
      expect(drawn()).toEqual({ node: { x: 100, y: 100 }, edge: { x: 100, y: 100 } })

      // From where it was drawn, not from the last tick.
      moveTo("node1", 100.3, 100)
      expect(isNear(drawn().node, { x: 100.3, y: 100 })).toBe(true)
      expect(isNear(drawn().edge, { x: 100.3, y: 100 })).toBe(true)

      // Where the layouts have it, once they catch up.
      moveTo("node1", 100.35, 100)
      graph.getLayouts()
      await nextTick()
      expect(drawn()).toEqual({ node: { x: 100.35, y: 100 }, edge: { x: 100.35, y: 100 } })
    })

    test("an edge placed again, as its style changes, is drawn where its nodes are", async () => {
      const { screen, state, moveTo } = await mountStopped()
      moveTo("node1", 100, 100)

      state.configs.edge = { normal: { width: 3 } }
      const line = screen.container.querySelector('[data-edge-id="edge1"]')!
      // Placed before the edge renders, in the same flush.
      await expect.poll(() => line.getAttribute("stroke-width")).toBe("3")

      expect(attributes(line, ["x1", "y1"])).toEqual({ x1: "100", y1: "100" })
    })

    test("a label adjusts its direction to where the nodes are drawn", async () => {
      const { screen, moveTo } = await mountStopped({
        node: { label: { directionAutoAdjustment: true } },
      })
      const label = screen.container.querySelector("text.v-ng-node-label")!
      const baseline = label.getAttribute("dominant-baseline")

      // Right above node2, where the label below would lie on the edge.
      moveTo("node1", 0, -100)

      await expect.poll(() => label.getAttribute("dominant-baseline")).not.toBe(baseline)
    })

    test("a box selection selects the nodes where they are drawn", async () => {
      const { graph, canvas, state, events, moveTo } = await mountStopped()
      moveTo("node1", 100, 100)
      expect(state.layouts.nodes.node1).toMatchObject({ x: -200, y: 0 })

      graph.startBoxSelection()
      await expect.poll(() => payloadsOf(events, "view:mode")).toEqual(["box-selection"])
      await drag(canvas, at(80, 80), at(120, 120))

      await expect.poll(() => [...state.selectedNodes]).toEqual(["node1"])
    })

    test("a node moved in the layout since the last draw is read where it is now", async () => {
      const { graph, canvas, state, events, moveTo } = await mountStopped()
      moveTo("node1", 100, 100)
      moveTo("node1", 50, 50, false)

      graph.startBoxSelection()
      await expect.poll(() => payloadsOf(events, "view:mode")).toEqual(["box-selection"])
      await drag(canvas, at(40, 40), at(60, 60))

      await expect.poll(() => [...state.selectedNodes]).toEqual(["node1"])
    })

    test("fitToContents() fits the nodes where they are drawn", async () => {
      const { graph, state, moveTo } = await mountStopped()
      moveTo("node1", 2000, 0)
      expect(state.layouts.nodes.node1).toMatchObject({ x: -200, y: 0 })

      await graph.fitToContents()

      expect(graph.getViewBox().right).toBeGreaterThan(2000)
    })
  })
})
