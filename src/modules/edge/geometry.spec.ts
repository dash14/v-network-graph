import { describe, expect, it } from "vitest"
import { MarkerStyle, ShapeStyle } from "@/common/configs"
import { Position } from "@/common/types"
import { EdgeLayoutPoint } from "@/models/edge"
import { calculateEdgeGeometry, EdgeGeometryInput } from "./geometry"

const shape = { type: "circle", radius: 16, strokeWidth: 0 } as ShapeStyle

const noMarker: MarkerStyle = {
  type: "none",
  width: 5,
  height: 5,
  margin: -1,
  offset: 0,
  units: "strokeWidth",
  color: null,
}
const arrow: MarkerStyle = { ...noMarker, type: "arrow" }

const edge = { source: "node1", target: "node2" }

function single(): EdgeLayoutPoint {
  return { edge, pointInGroup: 0, groupWidth: 0 }
}

function input(overrides: Partial<EdgeGeometryInput> = {}): EdgeGeometryInput {
  return {
    source: { x: 0, y: 0 },
    target: { x: 100, y: 0 },
    sourceShape: shape,
    targetShape: shape,
    layoutPoint: single(),
    summarized: false,
    line: { normalWidth: 2, source: noMarker, target: noMarker },
    type: "straight",
    margin: null,
    keepOrder: "clock",
    selfLoop: undefined,
    scale: 1,
    ...overrides,
  }
}

function distance(a: Position, b: Position) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

describe("calculateEdgeGeometry", () => {
  describe("straight edge", () => {
    it("should draw between the centers of the nodes without margins", () => {
      const g = calculateEdgeGeometry(input())

      expect(g.origin).toEqual({ p1: { x: 0, y: 0 }, p2: { x: 100, y: 0 } })
      expect(g.position).toBe(g.origin)
      expect(g.curve).toBeUndefined()
      expect(g.loop).toBeUndefined()
    })

    it("should place the labels between the outlines of the nodes", () => {
      const g = calculateEdgeGeometry(input())

      expect(g.labelPosition).toEqual({ p1: { x: 16, y: 0 }, p2: { x: 84, y: 0 } })
    })

    it("should start at the outlines of the nodes plus the margin", () => {
      const g = calculateEdgeGeometry(input({ margin: 4 }))

      expect(g.position).toEqual({ p1: { x: 20, y: 0 }, p2: { x: 80, y: 0 } })
    })

    it("should leave room for a marker sized by the stroke width", () => {
      const line = { normalWidth: 2, source: noMarker, target: arrow }
      const g = calculateEdgeGeometry(input({ line }))

      // (margin -1 + width 5) * stroke width 2 + node radius 16
      expect(g.position).toEqual({ p1: { x: 16, y: 0 }, p2: { x: 76, y: 0 } })
    })

    it("should leave room for a marker sized in user space", () => {
      const target: MarkerStyle = { ...arrow, units: "userSpaceOnUse" }
      const line = { normalWidth: 2, source: noMarker, target }
      const g = calculateEdgeGeometry(input({ line }))

      expect(g.position).toEqual({ p1: { x: 16, y: 0 }, p2: { x: 80, y: 0 } })
    })

    it("should scale the margins and the node outlines", () => {
      const g = calculateEdgeGeometry(input({ margin: 4, scale: 0.5 }))

      expect(g.position).toEqual({ p1: { x: 10, y: 0 }, p2: { x: 90, y: 0 } })
      expect(g.labelPosition).toEqual({ p1: { x: 8, y: 0 }, p2: { x: 92, y: 0 } })
    })

    it("should shift an edge in a group of edges sideways", () => {
      const layoutPoint = { edge, pointInGroup: 0, groupWidth: 4 }
      const g = calculateEdgeGeometry(input({ layoutPoint }))

      expect(Math.abs(g.origin.p1.y)).toBeCloseTo(2)
      expect(g.origin.p1.y).toBeCloseTo(g.origin.p2.y)
      expect(g.origin.p1.x).toBeCloseTo(0)
      expect(g.origin.p2.x).toBeCloseTo(100)
    })

    it("should still give finite positions without a layout point", () => {
      const g = calculateEdgeGeometry(input({ layoutPoint: undefined }))

      const points = [g.origin, g.labelPosition, g.position].flatMap(l => [l.p1, l.p2])
      expect(points.every(p => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(true)
    })
  })

  describe("curved edge", () => {
    const layoutPoint = { edge, pointInGroup: 0, groupWidth: 4 }

    it("should curve through the shifted center of the edge", () => {
      const g = calculateEdgeGeometry(input({ type: "curve", layoutPoint }))

      expect(g.origin).toEqual({ p1: { x: 0, y: 0 }, p2: { x: 100, y: 0 } })
      expect(g.position).toBe(g.origin)
      expect(g.curve).toBeDefined()
      expect(g.curve!.center.x).toBeCloseTo(50)
      expect(Math.abs(g.curve!.center.y)).toBeCloseTo(2)
      expect(g.curve!.control.length).toBeGreaterThan(0)
      expect(g.loop).toBeUndefined()
    })

    it("should keep the endpoints on the circle when margins apply", () => {
      const g = calculateEdgeGeometry(input({ type: "curve", layoutPoint, margin: 4 }))
      const { center, radius } = g.curve!.circle

      expect(distance(g.position.p1, center)).toBeCloseTo(radius)
      expect(distance(g.position.p2, center)).toBeCloseTo(radius)
      expect(g.position.p1.x).toBeGreaterThan(0)
      expect(g.position.p2.x).toBeLessThan(100)
    })

    it("should draw the middle edge of a group straight", () => {
      const middle = { edge, pointInGroup: 2, groupWidth: 4 }
      const g = calculateEdgeGeometry(input({ type: "curve", layoutPoint: middle }))

      expect(g.curve).toBeUndefined()
      expect(g.position).toEqual({ p1: { x: 0, y: 0 }, p2: { x: 100, y: 0 } })
    })

    it("should draw a short line at the center when the margins pass each other", () => {
      const g = calculateEdgeGeometry(
        input({ type: "curve", layoutPoint, target: { x: 40, y: 0 }, margin: 20 })
      )

      expect(g.curve).toBeUndefined()
      expect(g.position.p1.x).toBeCloseTo(20)
      expect(Math.abs(g.position.p1.y)).toBeCloseTo(2)
      expect(distance(g.position.p1, g.position.p2)).toBeCloseTo(0.5)
    })

    it("should draw straight between nodes at the same position", () => {
      const g = calculateEdgeGeometry(input({ type: "curve", layoutPoint, target: { x: 0, y: 0 } }))

      expect(g.curve).toBeUndefined()
      expect(g.position).toBe(g.origin)
    })

    it("should draw summarized edges straight between the centers", () => {
      const g = calculateEdgeGeometry(input({ type: "curve", layoutPoint, summarized: true }))

      expect(g.curve).toBeUndefined()
      expect(g.origin).toEqual({ p1: { x: 0, y: 0 }, p2: { x: 100, y: 0 } })
    })
  })

  describe("self-loop edge", () => {
    const node = { x: 0, y: 0 }
    const selfLoop = { radius: 12, offset: 10, angle: 270, isClockwise: true }
    const loopEdge = { source: "node1", target: "node1" }
    const loopInput = (overrides: Partial<EdgeGeometryInput> = {}) =>
      input({
        source: node,
        target: node,
        layoutPoint: { edge: loopEdge, pointInGroup: 0, groupWidth: 0 },
        selfLoop,
        ...overrides,
      })

    it("should draw an arc beside the node in the direction of the angle", () => {
      const g = calculateEdgeGeometry(loopInput())

      expect(g.origin).toEqual({ p1: node, p2: node })
      expect(g.curve).toBeUndefined()
      expect(g.loop!.radius).toEqual([12, 12])
      // angle 270 points left, at offset 10 plus the radius
      expect(g.loop!.center.x).toBeCloseTo(-22)
      expect(g.loop!.center.y).toBeCloseTo(0)
      expect(distance(g.position.p1, g.loop!.center)).toBeCloseTo(12)
      expect(distance(g.position.p2, g.loop!.center)).toBeCloseTo(12)
      expect(g.loop!.isClockwise).toBe(true)
    })

    it("should start the arc at the outline of the node with a marker", () => {
      // A marker of no size, which only makes the edge start at the outline.
      const marker: MarkerStyle = { ...arrow, units: "userSpaceOnUse", margin: -5 }
      const line = { normalWidth: 2, source: marker, target: marker }
      const g = calculateEdgeGeometry(loopInput({ selfLoop: { ...selfLoop, offset: 0 }, line }))

      expect(distance(g.position.p1, node)).toBeCloseTo(16)
      expect(distance(g.position.p2, node)).toBeCloseTo(16)
    })

    it("should draw a counter-clockwise loop from the other end", () => {
      const cw = calculateEdgeGeometry(loopInput({ selfLoop: { ...selfLoop, offset: 0 } }))
      const ccw = calculateEdgeGeometry(
        loopInput({ selfLoop: { ...selfLoop, offset: 0, isClockwise: false } })
      )

      expect(ccw.loop!.isClockwise).toBe(false)
      // Both go around the far side of the loop.
      expect(cw.loop!.isLargeArc).toBe(true)
      expect(ccw.loop!.isLargeArc).toBe(true)
      expect(ccw.position.p1.x).toBeCloseTo(cw.position.p2.x)
      expect(ccw.position.p1.y).toBeCloseTo(cw.position.p2.y)
      expect(ccw.position.p2.x).toBeCloseTo(cw.position.p1.x)
      expect(ccw.position.p2.y).toBeCloseTo(cw.position.p1.y)
    })

    it("should not depend on the edge type", () => {
      const straight = calculateEdgeGeometry(loopInput({ type: "straight" }))
      const curve = calculateEdgeGeometry(loopInput({ type: "curve" }))

      expect(curve).toEqual(straight)
    })

    it("should widen the loop for each edge in the group", () => {
      const layoutPoint = { edge: loopEdge, pointInGroup: 4, groupWidth: 4 }
      const g = calculateEdgeGeometry(loopInput({ layoutPoint }))

      expect(g.loop!.radius).toEqual([14, 14])
    })

    it("should scale the loop", () => {
      const g = calculateEdgeGeometry(loopInput({ scale: 2 }))

      expect(g.loop!.radius).toEqual([24, 24])
      expect(g.loop!.center.x).toBeCloseTo(-44)
    })
  })
})
