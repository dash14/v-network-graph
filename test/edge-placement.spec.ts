import { describe, expect, test, vi } from "vitest"
import { nextTick } from "vue"
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

  test("a change of what the placement reads re-places the edge", async () => {
    const { state } = await mountGraph(graph)
    vi.mocked(calculateEdgeGeometry).mockClear()

    state.configs = { ...state.configs, edge: { margin: 4 } }
    await nextTick()
    await nextTick()

    expect(calculateEdgeGeometry).toHaveBeenCalledTimes(1)
  })
})
