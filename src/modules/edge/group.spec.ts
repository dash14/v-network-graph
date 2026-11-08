import { describe, expect, it, vi } from "vitest"
import { nextTick, ref } from "vue"
import { getFullConfigs } from "@/common/config-defaults"
import { Edges, Nodes } from "@/common/types"
import { calculateEdgeShiftedPosition, makeEdgeGroupStates } from "./group"

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
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("Edge width is invalid value"),
      "edge1",
      "wide"
    )
    expect(states.edgeLayoutPoints.edge2.pointInGroup).toBe(4)
    warn.mockRestore()
  })

  it.each([
    [10, 10, false],
    [6, 6, false],
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

  it("should summarize the edges when the group is wider than the smaller circle node", async () => {
    const sized: Nodes = { node1: { size: 2 }, node2: { size: 20 } }
    const configs = getFullConfigs()
    configs.node.normal.radius = node => node.size
    configs.edge.normal.width = 2
    configs.edge.gap = 4
    configs.edge.summarize = true
    const states = makeEdgeGroupStates(ref(sized), ref(edges), configs)
    await nextTick()

    // The group is 6 wide, wider than the node of 4 across but not the one of 40.
    expect(states.edgeGroups["node1<=>node2"].summarize).toBe(true)
  })

  it("should not ask the summarize function about a single edge", async () => {
    const summarize = vi.fn(() => true)
    const configs = getFullConfigs()
    configs.edge.summarize = summarize
    const states = makeEdgeGroupStates(ref(nodes), ref({ edge1: edges.edge1 }), configs)
    await nextTick()

    expect(summarize).not.toHaveBeenCalled()
    expect(states.edgeGroups["node1<=>node2"].summarize).toBe(false)
  })
})

describe("calculateEdgeShiftedPosition", () => {
  const edge = { source: "node1", target: "node2" }
  // The first of two edges 10 apart, shifted 5 from the line between the centers.
  const point = { edge, pointInGroup: 0, groupWidth: 10 }

  function shifted(
    source: { x: number; y: number },
    target: { x: number; y: number },
    keepOrder: "clock" | "vertical" | "horizontal" = "clock",
    scale = 1
  ) {
    return calculateEdgeShiftedPosition(point, false, source, target, scale, keepOrder)
  }

  it.each([
    ["down", { x: 10, y: 100 }, { x: 15, y: 0 }],
    ["up", { x: 10, y: -100 }, { x: 5, y: 0 }],
  ])("should shift a vertical edge going %s sideways", (_, target, p1) => {
    expect(shifted({ x: 10, y: 0 }, target).p1).toEqual(p1)
  })

  it("should shift an edge between nodes at the same position across its horizontal line", () => {
    expect(shifted({ x: 10, y: 0 }, { x: 10, y: 0 })).toEqual({
      p1: { x: 10, y: -5 },
      p2: { x: 10, y: -5 },
    })
  })

  it("should scale the shift", () => {
    expect(shifted({ x: 10, y: 0 }, { x: 10, y: 100 }, "clock", 2).p1).toEqual({ x: 20, y: 0 })
  })

  it.each([
    // Kept in vertical order, an edge flips its shift when it points left, straight down included.
    ["vertical", { x: 100, y: 0 }, { x: 0, y: -5 }],
    ["vertical", { x: -100, y: 0 }, { x: 0, y: -5 }],
    ["vertical", { x: -100, y: -1 }, { x: 0.05, y: -5 }],
    ["vertical", { x: 0, y: 100 }, { x: -5, y: 0 }],
    ["vertical", { x: 0, y: -100 }, { x: -5, y: 0 }],
    // Kept in horizontal order, it flips when it points up.
    ["horizontal", { x: 100, y: 0 }, { x: 0, y: -5 }],
    ["horizontal", { x: 0, y: 100 }, { x: 5, y: 0 }],
    ["horizontal", { x: 0, y: -100 }, { x: 5, y: 0 }],
    ["clock", { x: -100, y: -100 }, { x: -3.536, y: 3.536 }],
  ] as const)("should keep the %s order of an edge to %j", (keepOrder, target, p1) => {
    const p = shifted({ x: 0, y: 0 }, target, keepOrder).p1
    expect(p.x).toBeCloseTo(p1.x, 3)
    expect(p.y).toBeCloseTo(p1.y, 3)
  })

  it("should keep the clock order for an unknown keepOrder", () => {
    const p = shifted({ x: 0, y: 0 }, { x: -100, y: -100 }, "unknown" as "clock").p1
    expect(p.x).toBeCloseTo(-3.536, 3)
    expect(p.y).toBeCloseTo(3.536, 3)
  })

  it("should flip an edge pointing left and slightly down away from the origin in vertical order", () => {
    const p = shifted({ x: 100, y: 0 }, { x: 0, y: 1 }, "vertical").p1
    expect(p.x).toBeCloseTo(99.95, 2)
    expect(p.y).toBeCloseTo(-5, 2)
  })
})
