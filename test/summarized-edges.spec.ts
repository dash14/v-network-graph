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
