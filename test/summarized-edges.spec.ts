import { describe, expect, test } from "vitest"
import { userEvent } from "vitest/browser"
import { h } from "vue"
import { at, mountGraph } from "./helpers/graph"

const props = () => ({
  nodes: { node1: { name: "Node 1" }, node2: { name: "Node 2" } },
  edges: {
    edge1: { source: "node1", target: "node2" },
    edge2: { source: "node2", target: "node1" },
  },
  layouts: { nodes: { node1: { x: -100, y: 0 }, node2: { x: 100, y: 0 } } },
  configs: { edge: { selectable: true, summarize: () => true } },
})

// Records the states each slot gets.
const recordStates =
  (name: string) =>
  ({ hovered, selected }: { hovered: boolean; selected: boolean }) =>
    h("g", { class: name, "data-hovered": hovered, "data-selected": selected })

const slots = {
  "edge-overlay": recordStates("overlay"),
  "edges-label": recordStates("label"),
}

describe("the slots of summarized edges", () => {
  test.each(["overlay", "label"])(
    "the %s slot gets selected when an edge other than the first is",
    async name => {
      const { screen, state } = await mountGraph(props(), { slots })
      const slot = () => screen.container.querySelector(`g.${name}`)
      expect(slot()?.getAttribute("data-selected")).toBe("false")

      state.selectedEdges = ["edge2"]
      await expect.poll(() => slot()?.getAttribute("data-selected")).toBe("true")
      expect(screen.container.querySelector(".v-ng-line-summarized.selected")).not.toBeNull()
    }
  )

  test.each(["overlay", "label"])(
    "the %s slot gets hovered with the summarized line",
    async name => {
      const { screen, canvas } = await mountGraph(props(), { slots })
      const slot = () => screen.container.querySelector(`g.${name}`)
      expect(slot()?.getAttribute("data-hovered")).toBe("false")

      await userEvent.hover(canvas, { position: at(-50, 0) })
      await expect.poll(() => slot()?.getAttribute("data-hovered")).toBe("true")
      expect(screen.container.querySelector(".v-ng-line-summarized.hovered")).not.toBeNull()
    }
  )
})

describe("summarized edges", () => {
  test.each([
    [true, true],
    [2, true],
    [1, false],
  ])("are drawn as selectable with selectable: %s, %s", async (selectable, expected) => {
    const graph = props()
    const { screen } = await mountGraph({
      ...graph,
      configs: { edge: { ...graph.configs.edge, selectable } },
    })
    const line = screen.container.querySelector(".v-ng-line-summarized")!
    expect(line.classList.contains("selectable")).toBe(expected)
  })

  test("put the shape and the count in the middle of the line", async () => {
    const tilted = props()
    tilted.layouts.nodes = { node1: { x: -100, y: -20 }, node2: { x: 100, y: 40 } }
    const { screen } = await mountGraph(tilted)
    const group = screen.container.querySelector(".v-ng-line-summarized")!
    // A 12x12 rect by default.
    const shape = group.querySelector("rect")!
    const text = group.querySelector("text")!
    expect([shape.getAttribute("x"), shape.getAttribute("y")]).toEqual(["-6", "4"])
    expect([text.getAttribute("x"), text.getAttribute("y"), text.textContent]).toEqual([
      "0",
      "10",
      "2",
    ])
  })
})

describe("the order of summarized edges", () => {
  test("summarized edges are ordered by the highest z-index among them", async () => {
    const p = props()
    const { screen } = await mountGraph({
      ...p,
      nodes: { ...p.nodes, node3: { name: "Node 3" } },
      edges: {
        edge1: { ...p.edges.edge1, z: 0 },
        edge2: { ...p.edges.edge2, z: 10 },
        edge3: { source: "node2", target: "node3", z: 5 },
      },
      layouts: { nodes: { ...p.layouts.nodes, node3: { x: 100, y: 100 } } },
      configs: {
        edge: {
          summarize: (edges: Record<string, unknown>) => Object.keys(edges).length > 1,
          zOrder: { enabled: true, zIndex: e => e.z as number },
        },
      },
    })
    const summarized = screen.container.querySelector(".v-ng-line-summarized")!
    const single = screen.container.querySelector('[data-edge-id="edge3"]')!
    expect(
      summarized.compareDocumentPosition(single) & Node.DOCUMENT_POSITION_PRECEDING
    ).toBeTruthy()
  })
})

describe("the markers of summarized edges", () => {
  const arrows = () => {
    const p = props()
    return {
      ...p,
      configs: { edge: { ...p.configs.edge, marker: { target: { type: "arrow" as const } } } },
    }
  }

  // The marker an end of the summarized line refers to, if any.
  const markerAt = (container: Element, end: "start" | "end") => {
    const line = container.querySelector(".v-ng-line-summarized .v-ng-line")
    const url = line?.getAttribute(`marker-${end}`)
    const id = url?.match(/#([^')]+)/)?.[1]
    return id ? container.querySelector(`marker#${id}`) : null
  }
  const markerIds = (container: Element) =>
    [...container.querySelectorAll("marker")].map(m => m.id).sort()

  test("keep the fields of the edges' markers that the override does not set", async () => {
    const graph = arrows()
    const { screen } = await mountGraph({
      ...graph,
      configs: {
        edge: {
          ...graph.configs.edge,
          summarized: { marker: { target: { color: "#ff0000" } } },
        },
      },
    })
    const target = markerAt(screen.container, "end")!
    expect(target.querySelector("polygon")?.getAttribute("fill")).toBe("#ff0000")
    expect(target.getAttribute("markerWidth")).toBe("5")
    expect(target.getAttribute("markerUnits")).toBe("strokeWidth")
    // The source end is not overridden.
    const source = markerAt(screen.container, "start")!
    expect(source.querySelector("polygon")?.getAttribute("fill")).toBe("#4466cc")
  })

  test("call a function with the edges and the stroke of the summarized line", async () => {
    const graph = arrows()
    const calls: [string[], number][] = []
    const { screen } = await mountGraph({
      ...graph,
      configs: {
        edge: {
          ...graph.configs.edge,
          summarized: {
            stroke: { width: 3 },
            marker: {
              target: {
                color: ([edges, stroke]) => {
                  calls.push([Object.keys(edges).sort(), stroke.width])
                  return "#ff0000"
                },
              },
            },
          },
        },
      },
    })
    expect(calls).toContainEqual([["edge1", "edge2"], 3])
    const marker = markerAt(screen.container, "end")!
    expect(marker.querySelector("polygon")?.getAttribute("fill")).toBe("#ff0000")
  })

  // Each edge in turn, as the group may reorder them.
  test.each(["edge1", "edge2"])(
    "take the marker other than none from %s among the edges",
    async marked => {
      const graph = arrows()
      const { screen } = await mountGraph({
        ...graph,
        edges: {
          edge1: { source: "node1", target: "node2", marked: marked === "edge1" },
          edge2: { source: "node1", target: "node2", marked: marked === "edge2" },
        },
        configs: {
          edge: {
            ...graph.configs.edge,
            marker: {
              target: {
                type: ([edge]) => (edge.marked ? "circle" : "none"),
              },
            },
          },
        },
      })
      expect(markerAt(screen.container, "end")?.querySelector("ellipse")).toBeInstanceOf(SVGElement)
      expect(markerAt(screen.container, "start")).toBeNull()
    }
  )

  test("are not drawn on summarized self-loops", async () => {
    const graph = arrows()
    const { screen } = await mountGraph({
      ...graph,
      edges: {
        edge1: { source: "node1", target: "node1" },
        edge2: { source: "node1", target: "node1" },
      },
    })
    const line = screen.container.querySelector(".v-ng-line-summarized .v-ng-line")!
    expect(line.hasAttribute("marker-start")).toBe(false)
    expect(line.hasAttribute("marker-end")).toBe(false)
  })

  test("are removed when the edges are no longer summarized", async () => {
    const { screen, state } = await mountGraph(arrows())
    expect(markerIds(screen.container)).toHaveLength(2)
    expect(markerAt(screen.container, "start")).not.toBeNull()

    state.edges = { edge1: { source: "node1", target: "node2" } }
    // The single edge has an arrow only at its target end.
    await expect.poll(() => markerIds(screen.container)).toHaveLength(1)
    expect(screen.container.querySelector(".v-ng-line-summarized")).toBeNull()

    state.edges = {}
    await expect.poll(() => screen.container.querySelector("marker")).toBeNull()
  })

  test("are in the SVG the graph is exported as", async () => {
    const { screen, graph } = await mountGraph(arrows())
    const svg = graph.getAsSvg()
    for (const end of ["start", "end"] as const) {
      const id = markerAt(screen.container, end)!.id
      expect(svg).toContain(`<marker id="${id}"`)
      expect(svg).toContain(`marker-${end}="url('#${id}')"`)
    }
  })
})
