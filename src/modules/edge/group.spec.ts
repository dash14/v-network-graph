import { describe, expect, it, vi } from "vitest"
import { nextTick, ref } from "vue"
import { getFullConfigs } from "@/common/config-defaults"
import { Edges, Nodes } from "@/common/types"
import { makeEdgeGroupStates } from "./group"

const nodes: Nodes = { node1: {}, node2: {} }
const edges: Edges = {
  edge1: { source: "node1", target: "node2" },
  edge2: { source: "node2", target: "node1" },
}

function statesOf(update: (configs: ReturnType<typeof getFullConfigs>) => void) {
  const configs = getFullConfigs()
  update(configs)
  return makeEdgeGroupStates(ref(nodes), ref(edges), configs)
}

describe("makeEdgeGroupStates", () => {
  it("should space the edges of a group by the gap a function gives", () => {
    const gap = vi.fn(() => 10)
    const states = statesOf(configs => {
      configs.edge.normal.width = 2
      configs.edge.gap = gap
    })

    expect(gap).toHaveBeenCalledWith(edges, expect.anything())
    expect(states.edgeLayoutPoints.edge2.pointInGroup).toBe(12)
  })

  it("should take an edge width that is not a number as 1", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const states = statesOf(configs => {
      configs.edge.normal.width = "wide" as unknown as number
      configs.edge.gap = 3
    })

    expect(warn).toHaveBeenCalledTimes(2)
    expect(states.edgeLayoutPoints.edge2.pointInGroup).toBe(4)
    warn.mockRestore()
  })

  it.each([
    [10, 10, false],
    [10, 4, true],
  ])(
    "should summarize the edges between rect nodes of %d by %d: %s",
    async (width, height, expected) => {
      const states = statesOf(configs => {
        configs.node.normal = { ...configs.node.normal, type: "rect", width, height }
        configs.edge.normal.width = 2
        configs.edge.gap = 4
        configs.edge.summarize = true
      })
      await nextTick()

      expect(states.edgeGroups["node1<=>node2"].summarize).toBe(expected)
    }
  )
})
