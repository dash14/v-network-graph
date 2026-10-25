import { describe, expect, test, vi } from "vitest"
import { userEvent } from "vitest/browser"
import type { Edges, LiteUserConfigs, UserConfigs } from "@/index"
import { ForceLayout } from "@/layouts/force"
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

function mountLite(props: { edges?: Edges; configs?: LiteUserConfigs; selectedNodes?: string[] }) {
  return mountGraph(
    { nodes, edges, layouts, ...props, configs: props.configs as UserConfigs },
    { lite: true }
  )
}

const attributes = (element: Element | null | undefined, names: string[]) =>
  Object.fromEntries(names.map(n => [n, element?.getAttribute(n)]))

describe("drawing", () => {
  test("draws a node as a shape, a label as a text and an edge as a line, with no group", async () => {
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

    const labels = [...c.querySelectorAll(".v-ng-layer-node-labels > text.v-ng-node-label")]
    expect(labels.map(e => e.textContent?.trim())).toEqual(["Node 1", "Node 2", "Node 3"])
    expect(labels[0].getAttribute("transform")).toBe("translate(-200 0)")
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
    expect(c.querySelector(".v-ng-viewport g g")).toBeNull()
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

  test("exports the graph as SVG", async () => {
    const { graph } = await mountLite({})
    const svg = await graph.exportAsSvgText()
    expect(svg).toContain("<line")
    expect(svg).toContain("<circle")
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
      () => {
        const p = state.layouts.nodes.node1
        const d = drawnPosition(screen.container, "node1")
        return p.x !== d.x || p.y !== d.y
      },
      { timeout: 5000, interval: POLL_INTERVAL }
    )
    // The edges follow the nodes drawn ahead, between their centers with no marker or margin.
    const line = screen.container.querySelector('[data-edge-id="edge1"]')
    const node1 = drawnPosition(screen.container, "node1")
    expect(attributes(line, ["x1", "y1"])).toEqual({ x1: `${node1.x}`, y1: `${node1.y}` })

    // Caught up when it ends.
    await vi.waitUntil(
      () => {
        const p = state.layouts.nodes.node1
        const d = drawnPosition(screen.container, "node1")
        return p.x === d.x && p.y === d.y
      },
      { timeout: 10000, interval: POLL_INTERVAL }
    )
  })

  test("updates the layouts before a node is grabbed", async () => {
    const { screen, state } = await mountLite({
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

    // Dispatched, so that no tick comes between the grab and the check.
    const node = screen.container.querySelectorAll(".v-ng-node")[1]
    node.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 1 }))
    const { x, y } = state.layouts.nodes.node2
    expect({ x, y }).toEqual(drawnPosition(screen.container, "node2"))
    document.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 1 }))
  })
})
