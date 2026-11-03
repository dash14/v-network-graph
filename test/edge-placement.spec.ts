import { describe, expect, test, vi } from "vitest"
import { nextTick } from "vue"
import type { LayoutHandler, PositionDrawer } from "@/layouts/handler"
import { calculateEdgeGeometry } from "@/modules/edge/geometry"
import { mountGraph } from "./helpers/graph"

vi.mock("@/modules/edge/geometry", { spy: true })

const graph = {
  nodes: { node1: {}, node2: {} },
  edges: { edge1: { source: "node1", target: "node2" } },
  layouts: { nodes: { node1: { x: -50, y: 0 }, node2: { x: 50, y: 0 } } },
}

describe("edge placement", () => {
  test("a change of the stroke alone does not re-place the edge", async () => {
    const { state } = await mountGraph(graph)
    vi.mocked(calculateEdgeGeometry).mockClear()

    state.selectedEdges = ["edge1"]
    await nextTick()
    await nextTick()

    expect(calculateEdgeGeometry).not.toHaveBeenCalled()
  })

  test("a marker colored by the stroke does not re-place the edge on a stroke change", async () => {
    const marker = {
      type: "arrow" as const,
      color: ([, stroke]: [unknown, { color: string }]) => stroke.color,
    }
    const { state } = await mountGraph({
      ...graph,
      configs: { edge: { selected: { color: "#ff0000" }, marker: { target: marker } } },
    })
    vi.mocked(calculateEdgeGeometry).mockClear()

    state.selectedEdges = ["edge1"]
    await nextTick()
    await nextTick()

    expect(calculateEdgeGeometry).not.toHaveBeenCalled()
  })

  test("a change of the color of a node alone does not re-place its edges", async () => {
    const { state } = await mountGraph({
      ...graph,
      configs: { node: { selectable: true, selected: { color: "#ff0000" } } },
    })
    vi.mocked(calculateEdgeGeometry).mockClear()

    state.selectedNodes = ["node1"]
    await nextTick()
    await nextTick()

    expect(calculateEdgeGeometry).not.toHaveBeenCalled()
  })

  test("a change of what the placement reads re-places the edge", async () => {
    const { state } = await mountGraph(graph)
    vi.mocked(calculateEdgeGeometry).mockClear()

    state.configs = { ...state.configs, edge: { margin: 4 } }
    await nextTick()
    await nextTick()

    expect(calculateEdgeGeometry).toHaveBeenCalledTimes(1)
  })

  test("an edge between the node centers is drawn ahead of the layouts with no geometry worked out", async () => {
    let drawer: PositionDrawer | undefined
    const layoutHandler: LayoutHandler = {
      activate: ({ positionDrawer }) => (drawer = positionDrawer),
      deactivate: () => {},
    }
    const { screen } = await mountGraph(
      { ...graph, configs: { view: { layoutHandler } } },
      { lite: true }
    )
    vi.mocked(calculateEdgeGeometry).mockClear()

    drawer!.draw(id => (id === "node1" ? { x: -100, y: 20 } : undefined))

    expect(calculateEdgeGeometry).not.toHaveBeenCalled()
    const line = screen.container.querySelector('[data-edge-id="edge1"]')
    expect([line?.getAttribute("x1"), line?.getAttribute("y1")]).toEqual(["-100", "20"])
  })

  test("a removed edge is not placed ahead of the layouts", async () => {
    let drawer: PositionDrawer | undefined
    const layoutHandler: LayoutHandler = {
      activate: ({ positionDrawer }) => (drawer = positionDrawer),
      deactivate: () => {},
    }
    // With a margin, so that placing it works out its geometry.
    const { state } = await mountGraph(
      { ...graph, configs: { view: { layoutHandler }, edge: { margin: 4 } } },
      { lite: true }
    )
    delete state.edges.edge1
    await nextTick()
    vi.mocked(calculateEdgeGeometry).mockClear()

    drawer!.draw(id => (id === "node1" ? { x: -100, y: 20 } : undefined))

    expect(calculateEdgeGeometry).not.toHaveBeenCalled()
  })
})
