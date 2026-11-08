import { describe, expect, it } from "vitest"
import { PathEndType, ShapeStyle } from "@/common/configs"
import { Position } from "@/common/types"
import { EdgeState, EdgeStates } from "@/models/edge"
import { NodeStates } from "@/models/node"
import { EdgeObject, PathState } from "@/models/path"
import { calculateEdgeGeometry, EdgeGeometryInput } from "@/modules/edge/geometry"
import { calculateDirectionsOfPathEdges, calculatePathPoints, quadraticCurveCommands } from "./path"

describe("quadraticCurveCommands", () => {
  it("should make one command for each pair of a control point and an end point", () => {
    const points = [
      { x: 1, y: 2 },
      { x: 3, y: 4 },
      { x: 5, y: 6 },
      { x: 7, y: 8 },
    ]
    expect(quadraticCurveCommands(points)).toStrictEqual(["Q 1 2 3 4", "Q 5 6 7 8"])
  })
})

describe("calculateDirectionsOfPathEdges", () => {
  it("should return an empty array if the edges are empty", () => {
    const result = calculateDirectionsOfPathEdges([])
    expect(result).toStrictEqual([])
  })

  it("should return one true if it has one edge", () => {
    const param: EdgeObject[] = [{ edgeId: "E1", edge: { source: "n1", target: "n2" } }]
    const result = calculateDirectionsOfPathEdges(param)
    expect(result).toStrictEqual([true])
  })

  describe("Two edges", () => {
    it("should return all true when the edges are all joined in the forward direction", () => {
      // (n1) ---[E1]--> (n2) ---[E2]--> (n3)
      const param: EdgeObject[] = [
        { edgeId: "E1", edge: { source: "n1", target: "n2" } },
        { edgeId: "E2", edge: { source: "n2", target: "n3" } },
      ]
      const result = calculateDirectionsOfPathEdges(param)
      expect(result).toStrictEqual([true, true])
    })

    it("should return all false when the edges are all joined in opposite directions", () => {
      // (n1) <--[E1]--- (n2) <--[E2]--- (n3)
      const param: EdgeObject[] = [
        { edgeId: "E1", edge: { source: "n2", target: "n1" } },
        { edgeId: "E2", edge: { source: "n3", target: "n2" } },
      ]
      const result = calculateDirectionsOfPathEdges(param)
      expect(result).toStrictEqual([false, false])
    })

    it("should return [true, false] if the edges are joined forward -> reverse", () => {
      // (n1) ---[E1]--> (n2) <--[E2]--- (n3)
      const param: EdgeObject[] = [
        { edgeId: "E1", edge: { source: "n1", target: "n2" } },
        { edgeId: "E2", edge: { source: "n3", target: "n2" } },
      ]
      const result = calculateDirectionsOfPathEdges(param)
      expect(result).toStrictEqual([true, false])
    })

    it("should return [false, true] if the edges are joined reverse -> forward", () => {
      // (n1) <--[E1]--- (n2) ---[E2]--> (n3)
      const param: EdgeObject[] = [
        { edgeId: "E1", edge: { source: "n2", target: "n1" } },
        { edgeId: "E2", edge: { source: "n2", target: "n3" } },
      ]
      const result = calculateDirectionsOfPathEdges(param)
      expect(result).toStrictEqual([false, true])
    })
  })

  describe("Three edges", () => {
    it("should return all true when the edges are all joined in the forward direction", () => {
      // (n1) ---[E1]--> (n2) ---[E2]--> (n3) ---[E3]--> (n4)
      const param: EdgeObject[] = [
        { edgeId: "E1", edge: { source: "n1", target: "n2" } },
        { edgeId: "E2", edge: { source: "n2", target: "n3" } },
        { edgeId: "E3", edge: { source: "n3", target: "n4" } },
      ]
      const result = calculateDirectionsOfPathEdges(param)
      expect(result).toStrictEqual([true, true, true])
    })

    it("should return all false when the edges are all joined in opposite directions", () => {
      // (n1) <--[E1]--- (n2) <--[E2]--- (n3) <--[E3]--- (n4)
      const param: EdgeObject[] = [
        { edgeId: "E1", edge: { source: "n2", target: "n1" } },
        { edgeId: "E2", edge: { source: "n3", target: "n2" } },
        { edgeId: "E3", edge: { source: "n4", target: "n3" } },
      ]
      const result = calculateDirectionsOfPathEdges(param)
      expect(result).toStrictEqual([false, false, false])
    })

    it("should return false only for some reverse direction (the first one is forward)", () => {
      // (n1) ---[E1]--> (n2) <--[E2]--- (n3) ---[E3]--> (n4)
      const param: EdgeObject[] = [
        { edgeId: "E1", edge: { source: "n1", target: "n2" } },
        { edgeId: "E2", edge: { source: "n3", target: "n2" } },
        { edgeId: "E3", edge: { source: "n3", target: "n4" } },
      ]
      const result = calculateDirectionsOfPathEdges(param)
      expect(result).toStrictEqual([true, false, true])
    })

    it("should return false only for some reverse direction (the first one is the reverse direction)", () => {
      // (n1) <--[E1]--- (n2) ---[E2]--> (n3) <--[E3]--- (n4)
      const param: EdgeObject[] = [
        { edgeId: "E1", edge: { source: "n2", target: "n1" } },
        { edgeId: "E2", edge: { source: "n2", target: "n3" } },
        { edgeId: "E3", edge: { source: "n4", target: "n3" } },
      ]
      const result = calculateDirectionsOfPathEdges(param)
      expect(result).toStrictEqual([false, true, false])
    })
  })

  describe("When the same edge is consecutive at the start", () => {
    it("should depend on the direction of the next item in the sequence of two (forward direction)", () => {
      // (n1) ---[E1]--> (n2) <--[E1]--- (n1) ---[E2]--> (n3)
      const e1 = { edgeId: "E1", edge: { source: "n1", target: "n2" } }
      const e2 = { edgeId: "E2", edge: { source: "n1", target: "n3" } }
      const param: EdgeObject[] = [e1, e1, e2]
      const result = calculateDirectionsOfPathEdges(param)
      expect(result).toStrictEqual([true, false, true])
    })

    it("should depend on the direction of the next item in the sequence of two (opposite direction)", () => {
      // (n2) <--[E1]--- (n1) ---[E1]--> (n2) <--[E2]--- (n3)
      const e1 = { edgeId: "E1", edge: { source: "n1", target: "n2" } }
      const e2 = { edgeId: "E2", edge: { source: "n3", target: "n2" } }
      const param: EdgeObject[] = [e1, e1, e2]
      const result = calculateDirectionsOfPathEdges(param)
      expect(result).toStrictEqual([false, true, false])
    })

    it("should depend on the direction of the next item in the sequence of three (forward direction)", () => {
      // (n1) ---[E1]--> (n2) <--[E1]--- (n1) ---[E1]--> (n2) ---[E2]--> (n3)
      const e1 = { edgeId: "E1", edge: { source: "n1", target: "n2" } }
      const e2 = { edgeId: "E2", edge: { source: "n2", target: "n3" } }
      const param: EdgeObject[] = [e1, e1, e1, e2]
      const result = calculateDirectionsOfPathEdges(param)
      expect(result).toStrictEqual([true, false, true, true])
    })

    it("should depend on the direction of the next item in the sequence of three (opposite direction)", () => {
      // (n2) <--[E1]--- (n1) ---[E1]--> (n2) <--[E1]--- (n1) <--[E2]--- (n3)
      const e1 = { edgeId: "E1", edge: { source: "n1", target: "n2" } }
      const e2 = { edgeId: "E2", edge: { source: "n3", target: "n1" } }
      const param: EdgeObject[] = [e1, e1, e1, e2]
      const result = calculateDirectionsOfPathEdges(param)
      expect(result).toStrictEqual([false, true, false, false])
    })

    it("should depend on the direction of the next item in the sequence of four (forward direction)", () => {
      // (n1) ---[E1]--> (n2) <--[E1]--- (n1) ---[E1]--> (n2) <--[E1]--- (n1) ---[E2]--> (n3)
      const e1 = { edgeId: "E1", edge: { source: "n1", target: "n2" } }
      const e2 = { edgeId: "E2", edge: { source: "n1", target: "n3" } }
      const param: EdgeObject[] = [e1, e1, e1, e1, e2]
      const result = calculateDirectionsOfPathEdges(param)
      expect(result).toStrictEqual([true, false, true, false, true])
    })

    it("should depend on the direction of the next item in the sequence of four (opposite direction)", () => {
      // (n2) <--[E1]--- (n1) ---[E1]--> (n2) <--[E1]--- (n1) ---[E1]--> (n2) <--[E2]--- (n3)
      const e1 = { edgeId: "E1", edge: { source: "n1", target: "n2" } }
      const e2 = { edgeId: "E2", edge: { source: "n3", target: "n2" } }
      const param: EdgeObject[] = [e1, e1, e1, e1, e2]
      const result = calculateDirectionsOfPathEdges(param)
      expect(result).toStrictEqual([false, true, false, true, false])
    })

    it("should work even when joined with a loop edge (joint is in the forward direction)", () => {
      // (n1) ---[E1]--> (n2) <--[E1]--- (n1) ---[E1]--> (n2) <--[E2]--*
      const e1 = { edgeId: "E1", edge: { source: "n1", target: "n2" } }
      const e2 = { edgeId: "E2", edge: { source: "n2", target: "n2" } }
      const param: EdgeObject[] = [e1, e1, e1, e2]
      const result = calculateDirectionsOfPathEdges(param)
      expect(result).toStrictEqual([true, false, true, true])
    })

    it("should work even when joined with a loop edge (joint is in the opposite direction)", () => {
      // (n2) <--[E1]--- (n1) ---[E1]--> (n2) <--[E1]--- (n1) <--[E2]--*
      const e1 = { edgeId: "E1", edge: { source: "n1", target: "n2" } }
      const e2 = { edgeId: "E2", edge: { source: "n1", target: "n1" } }
      const param: EdgeObject[] = [e1, e1, e1, e2]
      const result = calculateDirectionsOfPathEdges(param)
      expect(result).toStrictEqual([false, true, false, true])
    })
  })

  describe("should start in the forward direction if it is all the same edge", () => {
    it("two edges", () => {
      const e1 = { edgeId: "E1", edge: { source: "n1", target: "n2" } }
      const param: EdgeObject[] = [e1, e1]
      const result = calculateDirectionsOfPathEdges(param)
      expect(result).toStrictEqual([true, false])
    })

    it("three edges", () => {
      const e1 = { edgeId: "E1", edge: { source: "n1", target: "n2" } }
      const param: EdgeObject[] = [e1, e1, e1]
      const result = calculateDirectionsOfPathEdges(param)
      expect(result).toStrictEqual([true, false, true])
    })

    it("four edges", () => {
      const e1 = { edgeId: "E1", edge: { source: "n1", target: "n2" } }
      const param: EdgeObject[] = [e1, e1, e1, e1]
      const result = calculateDirectionsOfPathEdges(param)
      expect(result).toStrictEqual([true, false, true, false])
    })
  })

  describe("Loop edges (source === target)", () => {
    it("should return true for single loop edge", () => {
      const loop = { edgeId: "L1", edge: { source: "n1", target: "n1" } }
      const result = calculateDirectionsOfPathEdges([loop])
      expect(result).toStrictEqual([true])
    })

    it("should return all true for multiple loop edges", () => {
      const loop1 = { edgeId: "L1", edge: { source: "n1", target: "n1" } }
      const loop2 = { edgeId: "L2", edge: { source: "n2", target: "n2" } }
      const loop3 = { edgeId: "L3", edge: { source: "n3", target: "n3" } }
      const result = calculateDirectionsOfPathEdges([loop1, loop2, loop3])
      // Loop edges are always true
      expect(result).toStrictEqual([true, true, true])
    })

    it("should handle loop edge in the middle of path (forward -> loop -> forward)", () => {
      // (n1) ---[E1]--> (n2) --[L1]--* (n2) ---[E2]--> (n3)
      const e1 = { edgeId: "E1", edge: { source: "n1", target: "n2" } }
      const loop = { edgeId: "L1", edge: { source: "n2", target: "n2" } }
      const e2 = { edgeId: "E2", edge: { source: "n2", target: "n3" } }
      const result = calculateDirectionsOfPathEdges([e1, loop, e2])
      expect(result).toStrictEqual([true, true, true])
    })

    it("should handle loop edge in the middle of path (reverse -> loop -> reverse)", () => {
      // (n1) <--[E1]--- (n2) --[L1]--* (n2) <--[E2]--- (n3)
      const e1 = { edgeId: "E1", edge: { source: "n2", target: "n1" } }
      const loop = { edgeId: "L1", edge: { source: "n2", target: "n2" } }
      const e2 = { edgeId: "E2", edge: { source: "n3", target: "n2" } }
      const result = calculateDirectionsOfPathEdges([e1, loop, e2])
      expect(result).toStrictEqual([false, true, false])
    })

    it("should handle loop edge at the beginning of path", () => {
      // (n1) --[L1]--* (n1) ---[E1]--> (n2)
      const loop = { edgeId: "L1", edge: { source: "n1", target: "n1" } }
      const e1 = { edgeId: "E1", edge: { source: "n1", target: "n2" } }
      const result = calculateDirectionsOfPathEdges([loop, e1])
      // First edge: loop (n1) joints with E1 at n1, so loop's direction is based on next edge
      // Loop source/target are both n1, next edge starts at n1, so forward
      expect(result).toStrictEqual([true, true])
    })

    it("should handle loop edge at the end of path", () => {
      // (n1) ---[E1]--> (n2) --[L1]--* (n2)
      const e1 = { edgeId: "E1", edge: { source: "n1", target: "n2" } }
      const loop = { edgeId: "L1", edge: { source: "n2", target: "n2" } }
      const result = calculateDirectionsOfPathEdges([e1, loop])
      expect(result).toStrictEqual([true, true])
    })
  })
})

describe("calculateDirectionsOfPathEdges with different edges between the same nodes", () => {
  it.each([
    [
      // (n2) <--[E1]--- (n1) ---[E2]--> (n2) ---[E3]--> (n3)
      "the first one is taken in reverse",
      [
        ["E1", "n1", "n2"],
        ["E2", "n1", "n2"],
        ["E3", "n2", "n3"],
      ],
      [false, true, true],
    ],
    [
      // (n1) <--[E1]--- (n3) <--[E2]--- (n2) ---[E3]--> (n3)
      "the first two share only the node that sorts last",
      [
        ["E1", "n3", "n1"],
        ["E2", "n2", "n3"],
        ["E3", "n2", "n3"],
      ],
      [false, false, true],
    ],
    [
      // (n1) <--[E1]--- (n2) <--[E2]--- (n1) ---[E3]--> (n3)
      "the first one names the nodes the other way",
      [
        ["E1", "n2", "n1"],
        ["E2", "n1", "n2"],
        ["E3", "n1", "n3"],
      ],
      [false, false, true],
    ],
    [
      // (n2) <--[E1]--- (n1) <--[E2]--- (n2) ---[E3]--> (n3)
      "the second one names the nodes the other way",
      [
        ["E1", "n1", "n2"],
        ["E2", "n2", "n1"],
        ["E3", "n2", "n3"],
      ],
      [false, false, true],
    ],
  ])("should find the joint when %s", (_, edges, expected) => {
    const param: EdgeObject[] = edges.map(([edgeId, source, target]) => ({
      edgeId,
      edge: { source, target },
    }))
    expect(calculateDirectionsOfPathEdges(param)).toStrictEqual(expected)
  })
})

describe("calculatePathPoints", () => {
  const circle = { type: "circle", radius: 16, strokeWidth: 0 } as ShapeStyle
  const noMarker = {
    type: "none",
    width: 5,
    height: 5,
    margin: -1,
    offset: 0,
    units: "strokeWidth",
    color: null,
  } as const

  type EdgeSpec = [id: string, source: string, target: string, extra?: Partial<EdgeGeometryInput>]

  function pointsOf(
    nodes: Record<string, Position>,
    edges: EdgeSpec[],
    options: { scale?: number; curveInNode?: boolean; end?: PathEndType; margin?: number } = {}
  ) {
    const scale = options.scale ?? 1
    const nodeStates = Object.fromEntries(
      Object.keys(nodes).map(id => [id, { shape: circle }])
    ) as unknown as NodeStates
    const edgeStates: Record<string, Partial<EdgeState>> = {}
    for (const [id, source, target, extra] of edges) {
      const edge = { source, target }
      edgeStates[id] = calculateEdgeGeometry({
        source: nodes[source],
        target: nodes[target],
        sourceShape: circle,
        targetShape: circle,
        layoutPoint: { edge, pointInGroup: 0, groupWidth: 0 },
        summarized: false,
        line: { normalWidth: 2, source: noMarker, target: noMarker },
        type: "straight",
        margin: null,
        keepOrder: "clock",
        selfLoop: undefined,
        scale,
        ...extra,
      })
    }
    const pathEdges = edges.map(([edgeId, source, target]) => ({
      edgeId,
      edge: { source, target },
    }))
    const path = {
      edges: pathEdges,
      directions: calculateDirectionsOfPathEdges(pathEdges),
    } as unknown as PathState
    return calculatePathPoints(
      path,
      nodeStates,
      nodes,
      edgeStates as unknown as EdgeStates,
      scale,
      options.curveInNode ?? false,
      options.end ?? "centerOfNode",
      options.margin ?? 0
    )
  }

  function flat(points: (Position | Position[] | string)[]) {
    return points.flat().map(p => (typeof p === "string" ? p : { x: round(p.x), y: round(p.y) }))
  }

  function round(v: number) {
    return Math.round(v * 1000) / 1000 + 0 // + 0 turns -0 into 0
  }

  const corner = { n1: { x: 0, y: 0 }, n2: { x: 100, y: 0 }, n3: { x: 100, y: 100 } }
  const cornerEdges: EdgeSpec[] = [
    ["E1", "n1", "n2"],
    ["E2", "n2", "n3"],
  ]

  it("should scale the node radii at the ends and in the inner circle at the joint", () => {
    // At scale 2 the nodes are 32 in radius, and the inner circle 24: 4 inside, scaled.
    const points = pointsOf(corner, cornerEdges, { scale: 2, end: "edgeOfNode" })
    expect(flat(points)).toEqual([
      { x: 32, y: 0 },
      { x: 76, y: 0 },
      { x: 100, y: 24 },
      { x: 100, y: 68 },
    ])
  })

  it.each([
    [
      "start",
      { n1: { x: 0, y: 0 }, n2: { x: 74, y: 0 }, n3: { x: 74, y: 100 } },
      [
        { x: 50, y: 0 },
        { x: 74, y: 24 },
        { x: 74, y: 58 },
      ],
    ],
    [
      "end",
      { n1: { x: 0, y: -100 }, n2: { x: 0, y: 0 }, n3: { x: 74, y: 0 } },
      [
        { x: 0, y: -58 },
        { x: 0, y: -24 },
        { x: 24, y: 0 },
      ],
    ],
  ])(
    "should drop the %s when the margin reaches the node at the other end of the edge",
    (_, nodes, expected) => {
      // 10 + the radius 32 of the end node + the radius 32 of the other node = 74, the length.
      const points = pointsOf(nodes, cornerEdges, { scale: 2, end: "edgeOfNode", margin: 10 })
      expect(flat(points)).toEqual(expected)
    }
  )

  it.each([
    ["mostly outside the node, on the large arc", 12, 10, true, "1 1"],
    ["mostly outside the node, counterclockwise", 12, 10, false, "1 0"],
    ["mostly inside the node, on the small arc", 12, -4, true, "0 1"],
    ["mostly inside the node, counterclockwise", 12, -4, false, "0 0"],
    ["apart from the node", 12, 30, true, "1 1"],
    ["apart from the node, counterclockwise", 12, 30, false, "1 0"],
  ])("should draw a self-loop %s", (_, radius, offset, isClockwise, flags) => {
    const nodes = { n1: { x: 0, y: -100 }, n2: { x: 0, y: 0 }, n3: { x: 0, y: 100 } }
    const selfLoop = { radius, offset, angle: 270, isClockwise }
    const points = pointsOf(nodes, [
      ["E1", "n1", "n2"],
      ["L", "n2", "n2", { selfLoop }],
      ["E2", "n2", "n3"],
    ])
    const arc = points.find(p => typeof p === "string")
    expect(arc).toMatch(new RegExp(`^A ${radius} ${radius} 0 ${flags} `))
  })

  it.each([
    [true, "1 1"],
    [false, "1 0"],
  ])(
    "should draw a self-loop apart from the node at the end of a path (clockwise: %s)",
    (isClockwise, flags) => {
      const nodes = { n1: { x: 0, y: -100 }, n2: { x: 0, y: 0 } }
      const selfLoop = { radius: 12, offset: 30, angle: 270, isClockwise }
      const points = pointsOf(nodes, [
        ["E1", "n1", "n2"],
        ["L", "n2", "n2", { selfLoop }],
      ])
      expect(points.at(-1)).toMatch(new RegExp(`^A 12 12 0 ${flags} `))
    }
  )
})
