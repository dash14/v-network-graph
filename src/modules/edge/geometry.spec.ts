import { describe, expect, it } from "vitest"
import { MarkerStyle, ShapeStyle } from "@/common/configs"
import { Position } from "@/common/types"
import { Curve, EdgeLayoutPoint } from "@/models/edge"
import { Vector2D } from "@/modules/vector2d"
import {
  calculateEdgeGeometry,
  edgeLengthOf,
  edgePathOf,
  EdgeGeometryInput,
  pointAlongEdge,
} from "./geometry"

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

// The length of the arc from a to b around a center, both on its circle, the short way.
function arcBetween(center: Position, a: Position, b: Position) {
  const angle = Math.abs(
    Math.atan2(a.y - center.y, a.x - center.x) - Math.atan2(b.y - center.y, b.x - center.x)
  )
  return Math.min(angle, 2 * Math.PI - angle) * distance(a, center)
}

const point = { type: "circle", radius: 0, strokeWidth: 0 } as ShapeStyle

describe("calculateEdgeGeometry", () => {
  describe("straight edge", () => {
    it("should draw between the centers of the nodes without margins", () => {
      const g = calculateEdgeGeometry(input())

      expect(g.origin).toEqual({ p1: { x: 0, y: 0 }, p2: { x: 100, y: 0 } })
      expect(g.position).toBe(g.origin)
      expect(g.curve).toBeUndefined()
      expect(g.loop).toBeUndefined()
    })

    // A graph drawing the nodes ahead of the layouts draws such an edge between the centers itself.
    it.each([
      ["clock", shape, 1],
      [
        "vertical",
        { type: "rect", width: 30, height: 10, borderRadius: 2, strokeWidth: 1 } as ShapeStyle,
        1,
      ],
      ["horizontal", shape, 2],
    ] as const)(
      "should draw between the centers with no marker, margin or edge beside it, kept in %s order",
      (keepOrder, nodeShape, scale) => {
        const ends = { source: { x: 40, y: 30 }, target: { x: -20, y: -70 } }
        const g = calculateEdgeGeometry(
          input({ ...ends, keepOrder, sourceShape: nodeShape, targetShape: nodeShape, scale })
        )

        expect(g.position).toEqual({ p1: ends.source, p2: ends.target })
      }
    )

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

    it.each([
      ["source", { sourceShape: point, line: { normalWidth: 2, source: noMarker, target: arrow } }],
      ["target", { targetShape: point, line: { normalWidth: 2, source: arrow, target: noMarker } }],
    ])("should leave the end at a %s node of no size where it is", (end, overrides) => {
      const g = calculateEdgeGeometry(input(overrides))

      const kept = end === "source" ? g.position.p1 : g.position.p2
      const moved = end === "source" ? g.position.p2 : g.position.p1
      expect(kept).toEqual(end === "source" ? { x: 0, y: 0 } : { x: 100, y: 0 })
      // the marker (-1 + 5) * 2 and the radius 16
      expect(distance(moved, end === "source" ? { x: 100, y: 0 } : { x: 0, y: 0 })).toBe(24)
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

  const rect = {
    type: "rect",
    width: 32,
    height: 24,
    borderRadius: 0,
    strokeWidth: 0,
  } as ShapeStyle
  describe.each([
    { type: "straight", nodeShape: shape },
    { type: "curve", nodeShape: shape },
    { type: "straight", nodeShape: rect },
    { type: "curve", nodeShape: rect },
  ] as const)(
    "$type edges between $nodeShape.type nodes at the same position",
    ({ type, nodeShape }) => {
      const at = (pointInGroup: number) =>
        calculateEdgeGeometry(
          input({
            type,
            target: { x: 0, y: 0 },
            sourceShape: nodeShape,
            targetShape: nodeShape,
            layoutPoint: { edge, pointInGroup, groupWidth: 10 },
            margin: 4,
          })
        )

      it("should be drawn as parallel horizontal lines", () => {
        const [first, second] = [at(0), at(10)]

        expect([first.curve, second.curve]).toEqual([undefined, undefined])
        for (const { position } of [first, second]) {
          expect(position.p1.y).toBe(position.p2.y)
          expect(position.p1.x).not.toBeCloseTo(position.p2.x)
        }
        expect([first.position.p1.y, second.position.p1.y]).toEqual([-5, 5])
      })
    }
  )

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

    it.each([
      ["outward", layoutPoint],
      ["the other way", { edge, pointInGroup: 4, groupWidth: 4 }],
    ])("should move the ends into the arc along a curve bent %s", (_, layoutPoint) => {
      const g = calculateEdgeGeometry(input({ type: "curve", layoutPoint, margin: 4 }))
      const { center } = g.curve!.circle

      // the node radius 16 plus the margin 4, along the circle
      expect(arcBetween(center, g.origin.p1, g.position.p1)).toBeCloseTo(20)
      expect(arcBetween(center, g.origin.p2, g.position.p2)).toBeCloseTo(20)
      expect(g.position.p1.x).toBeGreaterThan(0)
      expect(g.position.p2.x).toBeLessThan(100)
    })

    it("should scale the margins along a curve", () => {
      const g = calculateEdgeGeometry(input({ type: "curve", layoutPoint, margin: 4, scale: 2 }))
      const { center } = g.curve!.circle

      expect(arcBetween(center, g.origin.p1, g.position.p1)).toBeCloseTo(40)
      expect(arcBetween(center, g.origin.p2, g.position.p2)).toBeCloseTo(40)
    })

    it.each([
      ["a curve", layoutPoint],
      ["the middle edge of a group", { edge, pointInGroup: 2, groupWidth: 4 }],
    ])("should leave the end at a node of no size where it is on %s", (_, layoutPoint) => {
      const atTarget = calculateEdgeGeometry(
        input({
          type: "curve",
          layoutPoint,
          targetShape: point,
          line: { normalWidth: 2, source: arrow, target: noMarker },
        })
      )
      const atSource = calculateEdgeGeometry(
        input({
          type: "curve",
          layoutPoint,
          sourceShape: point,
          line: { normalWidth: 2, source: noMarker, target: arrow },
        })
      )

      expect(atTarget.position.p1.x).toBeGreaterThan(0)
      expect(atTarget.position.p2.x).toBeCloseTo(100)
      expect(atTarget.position.p2.y).toBeCloseTo(0)
      expect(atSource.position.p1.x).toBeCloseTo(0)
      expect(atSource.position.p1.y).toBeCloseTo(0)
      expect(atSource.position.p2.x).toBeLessThan(100)
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

    it("should draw a short line at the center when the margins pass each other by over half the circle", () => {
      // The margins, 26 at each end, overshoot this arc of about 12.9 by more than half its circle.
      const g = calculateEdgeGeometry(
        input({ type: "curve", layoutPoint, target: { x: 12, y: 0 }, margin: 10 })
      )

      expect(g.curve).toBeUndefined()
      expect(g.position.p1.x).toBeCloseTo(6)
      expect(Math.abs(g.position.p1.y)).toBeCloseTo(2)
      expect(distance(g.position.p1, g.position.p2)).toBeCloseTo(0.5)
    })

    it("should draw straight between nodes at the same position", () => {
      const g = calculateEdgeGeometry(input({ type: "curve", layoutPoint, target: { x: 0, y: 0 } }))

      expect(g.curve).toBeUndefined()
      expect(g.position).toBe(g.origin)
    })

    it("should draw an edge whose layout point is gone as the middle of its group", () => {
      const g = calculateEdgeGeometry(input({ type: "curve", layoutPoint: undefined }))
      const middle = calculateEdgeGeometry(
        input({ type: "curve", layoutPoint: { edge, pointInGroup: 20, groupWidth: 40 } })
      )

      expect(g.position).toEqual(middle.position)
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

    it("should start a counter-clockwise loop with a marker from the other crossing", () => {
      const marker: MarkerStyle = { ...arrow, units: "userSpaceOnUse", margin: -5 }
      const line = { normalWidth: 2, source: marker, target: marker }
      const loopWith = (isClockwise: boolean) =>
        calculateEdgeGeometry(
          loopInput({ selfLoop: { ...selfLoop, offset: 0, isClockwise }, line })
        )
      const cw = loopWith(true)
      const ccw = loopWith(false)

      expect(ccw.position.p1.x).toBeCloseTo(cw.position.p2.x)
      expect(ccw.position.p1.y).toBeCloseTo(cw.position.p2.y)
      expect(ccw.position.p2.x).toBeCloseTo(cw.position.p1.x)
      expect(ccw.position.p2.y).toBeCloseTo(cw.position.p1.y)
    })

    it("should draw a loop clear of the node from the side nearest it, even with a marker", () => {
      const marker: MarkerStyle = { ...arrow, units: "userSpaceOnUse", margin: -5 }
      const line = { normalWidth: 2, source: marker, target: marker }
      const g = calculateEdgeGeometry(loopInput({ selfLoop: { ...selfLoop, offset: 30 }, line }))
      const plain = calculateEdgeGeometry(loopInput({ selfLoop: { ...selfLoop, offset: 30 } }))

      expect(g.position).toEqual(plain.position)
    })

    it("should draw a loop whose layout point is gone as the first of its group", () => {
      const g = calculateEdgeGeometry(loopInput({ layoutPoint: undefined }))

      expect(g.loop!.radius).toEqual([12, 12])
    })

    it("should widen the loop for each edge in the group", () => {
      const layoutPoint = { edge: loopEdge, pointInGroup: 4, groupWidth: 4 }
      const g = calculateEdgeGeometry(loopInput({ layoutPoint }))

      expect(g.loop!.radius).toEqual([14, 14])
    })

    it.each([true, false])(
      "should start a loop without a marker 1 degree to each side of the node, clockwise %s",
      isClockwise => {
        const g = calculateEdgeGeometry(loopInput({ selfLoop: { ...selfLoop, isClockwise } }))
        const { center } = g.loop!

        // The radius toward the node points right, from the center at x -22.
        const rad = (Math.PI / 180) * (isClockwise ? 1 : -1)
        expect(g.position.p1.x).toBeCloseTo(center.x + 12 * Math.cos(rad))
        expect(g.position.p1.y).toBeCloseTo(12 * Math.sin(rad))
        expect(g.position.p2.y).toBeCloseTo(-12 * Math.sin(rad))
      }
    )

    it("should start the arc at the scaled outline of the node", () => {
      const marker: MarkerStyle = { ...arrow, units: "userSpaceOnUse", margin: -5 }
      const line = { normalWidth: 2, source: marker, target: marker }
      const g = calculateEdgeGeometry(
        loopInput({ selfLoop: { ...selfLoop, offset: 0 }, line, scale: 2 })
      )

      expect(distance(g.position.p1, node)).toBeCloseTo(32)
      expect(distance(g.position.p2, node)).toBeCloseTo(32)
    })

    it.each([true, false])(
      "should move the start of a loop away from the node by its scaled margin, clockwise %s",
      isClockwise => {
        // A marker 5 in user space at the source only.
        const marker: MarkerStyle = { ...arrow, units: "userSpaceOnUse", margin: 0 }
        const at = (line: EdgeGeometryInput["line"]) =>
          calculateEdgeGeometry(
            loopInput({ selfLoop: { ...selfLoop, offset: 0, isClockwise }, line, scale: 2 })
          )
        const outline: MarkerStyle = { ...marker, margin: -5 }
        const plain = at({ normalWidth: 2, source: outline, target: outline })
        const g = at({ normalWidth: 2, source: marker, target: outline })
        const { center } = g.loop!

        expect(arcBetween(center, plain.position.p1, g.position.p1)).toBeCloseTo(10)
        expect(distance(g.position.p1, node)).toBeGreaterThan(32)
        expect(g.position.p2).toEqual(plain.position.p2)

        const toTarget = at({ normalWidth: 2, source: outline, target: marker })
        expect(arcBetween(center, plain.position.p2, toTarget.position.p2)).toBeCloseTo(10)
        expect(distance(toTarget.position.p2, node)).toBeGreaterThan(32)
      }
    )

    it("should scale the loop", () => {
      const g = calculateEdgeGeometry(loopInput({ scale: 2 }))

      expect(g.loop!.radius).toEqual([24, 24])
      expect(g.loop!.center.x).toBeCloseTo(-44)
    })
  })
})

describe("edgeLengthOf and pointAlongEdge", () => {
  const position = { p1: { x: 0, y: 0 }, p2: { x: 30, y: 40 } }

  it("should measure a straight line", () => {
    expect(edgeLengthOf({ position })).toBe(50)
    expect(pointAlongEdge({ position }, 25)).toEqual({ x: 15, y: 20 })
  })

  it("should clamp the distance to the line", () => {
    expect(pointAlongEdge({ position }, -10)).toEqual({ x: 0, y: 0 })
    expect(pointAlongEdge({ position }, 80)).toEqual({ x: 30, y: 40 })
  })

  it("should measure a quarter of a circle clockwise on screen", () => {
    // From the right of the center to below it, which is clockwise when y points down.
    const center = new Vector2D(0, 0)
    const loop = {
      center,
      radius: [10, 10] as [number, number],
      isLargeArc: false,
      isClockwise: true,
    }
    const arc = { position: { p1: { x: 10, y: 0 }, p2: { x: 0, y: 10 } }, loop }

    expect(edgeLengthOf(arc)).toBeCloseTo((Math.PI * 10) / 2)
    const p = pointAlongEdge(arc, (Math.PI * 10) / 4)
    expect(p.x).toBeCloseTo(10 * Math.SQRT1_2)
    expect(p.y).toBeCloseTo(10 * Math.SQRT1_2)
  })

  it("should measure the other way around a circle counterclockwise", () => {
    const center = new Vector2D(0, 0)
    const loop = {
      center,
      radius: [10, 10] as [number, number],
      isLargeArc: true,
      isClockwise: false,
    }
    const arc = { position: { p1: { x: 10, y: 0 }, p2: { x: 0, y: 10 } }, loop }

    expect(edgeLengthOf(arc)).toBeCloseTo((Math.PI * 10 * 3) / 2)
    const p = pointAlongEdge(arc, (Math.PI * 10) / 2)
    expect(p.x).toBeCloseTo(0)
    expect(p.y).toBeCloseTo(-10)
  })

  it("should give the start of a loop of no radius", () => {
    const loop = {
      center: new Vector2D(5, 5),
      radius: [0, 0] as [number, number],
      isLargeArc: true,
      isClockwise: true,
    }
    const arc = { position: { p1: { x: 5, y: 5 }, p2: { x: 5, y: 5 } }, loop }

    expect(edgeLengthOf(arc)).toBe(0)
    expect(pointAlongEdge(arc, 0)).toEqual({ x: 5, y: 5 })
  })

  it("should give the start of a line of no length", () => {
    const point = { position: { p1: { x: 5, y: 5 }, p2: { x: 5, y: 5 } } }

    expect(edgeLengthOf(point)).toBe(0)
    expect(pointAlongEdge(point, 0)).toEqual({ x: 5, y: 5 })
  })

  it("should give the start of a curve of no length", () => {
    const curve = { control: [{ x: 5, y: 5 }] } as unknown as Curve
    const point = { position: { p1: { x: 5, y: 5 }, p2: { x: 5, y: 5 } }, curve }

    expect(edgeLengthOf(point)).toBe(0)
    expect(pointAlongEdge(point, 0)).toEqual({ x: 5, y: 5 })
  })

  it("should draw the small arc flag of a loop that is not large", () => {
    const loop = {
      center: new Vector2D(0, 0),
      radius: [10, 10] as [number, number],
      isLargeArc: false,
      isClockwise: true,
    }
    const arc = { position: { p1: { x: 10, y: 0 }, p2: { x: 0, y: 10 } }, loop }

    expect(edgePathOf(arc)).toBe("M 10 0 A 10 10 0 0 1 0 10")
  })

  it("should measure the same position again when drawn as a loop", () => {
    const loop = {
      center: new Vector2D(15, 20),
      radius: [25, 25] as [number, number],
      isLargeArc: true,
      isClockwise: true,
    }

    expect(edgeLengthOf({ position })).toBe(50)
    expect(edgeLengthOf({ position, loop })).toBeGreaterThan(50)
  })

  it("should find points along a curve whose speed falls to 0 at its start", () => {
    // With the control point on the start, a point moves along the line by the square of time.
    const p2 = { x: 60, y: 80 }
    const curve = { control: [{ x: 0, y: 0 }] } as unknown as Curve
    const edge = { position: { p1: { x: 0, y: 0 }, p2 }, curve }

    expect(edgeLengthOf(edge)).toBeCloseTo(100)
    for (const d of [0.01, 1, 25, 50, 99.99]) {
      const p = pointAlongEdge(edge, d)
      expect(p.x).toBeCloseTo((p2.x * d) / 100, 6)
      expect(p.y).toBeCloseTo((p2.y * d) / 100, 6)
    }
  })

  it("should find points along a curve whose speed falls to 0 in its middle", () => {
    // The curve goes out to x = 50 and back, and the search starts at the turn, half way along it.
    const curve = { control: [{ x: 100, y: 0 }] } as unknown as Curve
    const edge = { position: { p1: { x: 0, y: 0 }, p2: { x: 0, y: 0 } }, curve }

    const p = pointAlongEdge(edge, edgeLengthOf(edge) / 2)
    expect(p.x).toBeGreaterThan(45)
    expect(p.x).toBeLessThanOrEqual(50)
    expect(p.y).toBe(0)
  })

  it("should measure a curve as its path is drawn", () => {
    const g = calculateEdgeGeometry(
      input({ type: "curve", layoutPoint: { edge, pointInGroup: 0, groupWidth: 40 } })
    )
    const end = g.position.p2

    expect(edgePathOf(g)).toMatch(/^M 0 0 Q /)
    expect(edgeLengthOf(g)).toBeGreaterThan(100)
    const last = pointAlongEdge(g, edgeLengthOf(g))
    expect(last.x).toBeCloseTo(end.x)
    expect(last.y).toBeCloseTo(end.y)
    const middle = pointAlongEdge(g, edgeLengthOf(g) / 2)
    expect(middle.x).toBeCloseTo(50)
    expect(Math.abs(middle.y)).toBeCloseTo(20)
  })

  it("should measure an arc around a center off the origin", () => {
    const loop = {
      center: new Vector2D(100, 50),
      radius: [10, 10] as [number, number],
      isLargeArc: false,
      isClockwise: true,
    }
    // From the right of the center to 60 degrees clockwise from there.
    const p2 = { x: 100 + 10 * Math.cos(Math.PI / 3), y: 50 + 10 * Math.sin(Math.PI / 3) }
    const arc = { position: { p1: { x: 110, y: 50 }, p2 }, loop }

    expect(edgeLengthOf(arc)).toBeCloseTo((Math.PI * 10) / 3)
    const p = pointAlongEdge(arc, (Math.PI * 10) / 6)
    expect(p.x).toBeCloseTo(100 + 10 * Math.cos(Math.PI / 6))
    expect(p.y).toBeCloseTo(50 + 10 * Math.sin(Math.PI / 6))
  })

  it("should measure the same position again when drawn as a curve", () => {
    const g = calculateEdgeGeometry(
      input({ type: "curve", layoutPoint: { edge, pointInGroup: 0, groupWidth: 40 } })
    )

    expect(edgeLengthOf({ position: g.position })).toBe(100)
    expect(edgeLengthOf(g)).toBeGreaterThan(100)
  })
})
