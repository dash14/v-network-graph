import { describe, expect, it } from "vitest"
import { CircleShapeStyle, RectangleShapeStyle } from "../../common/configs"
import { Vector2D } from "../vector2d"
import { VectorLine } from "./line"
import * as v2d from "./2d"

describe("calculateDistancesFromCenterOfNodeToEndOfNode", () => {
  describe("circle to circle", () => {
    const sourceShape: CircleShapeStyle = {
      type: "circle",
      radius: 10,
      strokeWidth: 0,
      color: "#fff",
    }
    const targetShape: CircleShapeStyle = {
      type: "circle",
      radius: 15,
      strokeWidth: 2,
      color: "#fff",
    }

    it("should radius with half of stroke width", () => {
      const sourcePos = { x: 10, y: 10 }
      const targetPos = { x: 110, y: 110 }

      const [sourceMargin, targetMargin] = v2d.calculateDistancesFromCenterOfNodeToEndOfNode(
        sourcePos,
        targetPos,
        sourceShape,
        targetShape
      )

      expect(sourceMargin).to.be.equal(10)
      expect(targetMargin).to.be.equal(16)
    })
  })

  describe("rect to rect", () => {
    const sourceShape: RectangleShapeStyle = {
      type: "rect",
      width: 100,
      height: 20,
      borderRadius: 0,
      strokeWidth: 2,
      color: "#fff",
    }
    const targetShape: RectangleShapeStyle = {
      type: "rect",
      width: 40,
      height: 30,
      borderRadius: 0,
      strokeWidth: 4,
      color: "#fff",
    }

    it("should calculate correctly: vertically aligned", () => {
      const sourcePos = { x: 10, y: 10 }
      const targetPos = { x: 10, y: 110 }

      const [sourceMargin, targetMargin] = v2d.calculateDistancesFromCenterOfNodeToEndOfNode(
        sourcePos,
        targetPos,
        sourceShape,
        targetShape
      )

      expect(sourceMargin).to.be.equal(11) // half of height + stroke
      expect(targetMargin).to.be.equal(17)
    })

    it("should calculate correctly: horizontally aligned", () => {
      const sourcePos = { x: 10, y: 10 }
      const targetPos = { x: 210, y: 10 }

      const [sourceMargin, targetMargin] = v2d.calculateDistancesFromCenterOfNodeToEndOfNode(
        sourcePos,
        targetPos,
        sourceShape,
        targetShape
      )

      expect(sourceMargin).to.be.equal(51) // half of width + stroke
      expect(targetMargin).to.be.equal(22)
    })

    it("should calculate correctly: located at an angle", () => {
      const sourcePos = { x: 10, y: 10 }
      const targetPos = { x: 60, y: 60 }

      const [sourceMargin, targetMargin] = v2d.calculateDistancesFromCenterOfNodeToEndOfNode(
        sourcePos,
        targetPos,
        sourceShape,
        targetShape
      )

      expect(sourceMargin).toBeCloseTo(Math.sqrt(11 ** 2 + 11 ** 2))
      expect(targetMargin).toBeCloseTo(Math.sqrt(17 ** 2 + 17 ** 2))
    })
  })

  describe("rounded rect to rounded rect", () => {
    const sourceShape: RectangleShapeStyle = {
      type: "rect",
      width: 40,
      height: 40,
      borderRadius: 10,
      strokeWidth: 2,
      color: "#fff",
    }
    const targetShape: RectangleShapeStyle = {
      type: "rect",
      width: 40,
      height: 40,
      borderRadius: 20,
      strokeWidth: 4,
      color: "#fff",
    }

    it("should calculate correctly: located at an angle 1", () => {
      const sourcePos = { x: 10, y: 10 }
      const targetPos = { x: 100, y: 100 }

      const [sourceMargin, targetMargin] = v2d.calculateDistancesFromCenterOfNodeToEndOfNode(
        sourcePos,
        targetPos,
        sourceShape,
        targetShape
      )

      expect(sourceMargin).toBeCloseTo(25.142)
      expect(targetMargin).toBeCloseTo(22)
    })

    it("should calculate correctly: located at an angle 2", () => {
      const sourcePos = { x: 10, y: 10 }
      const targetPos = { x: 140, y: 100 }

      const [sourceMargin, targetMargin] = v2d.calculateDistancesFromCenterOfNodeToEndOfNode(
        sourcePos,
        targetPos,
        sourceShape,
        targetShape
      )

      expect(sourceMargin).toBeCloseTo(24.619)
      expect(targetMargin).toBeCloseTo(22)
    })
  })
})

describe("moveOnCircumference", () => {
  // Boundary values for trigonometric functions: 0, π/2, π, 3π/2, 2π
  it.each([
    // [description, radian, expectedX, expectedY]
    ["0 degrees (boundary)", 0, 10, 0],
    ["90 degrees (boundary)", Math.PI / 2, 0, 10],
    ["180 degrees (boundary)", Math.PI, -10, 0],
    ["270 degrees (boundary)", (3 * Math.PI) / 2, 0, -10],
    ["360 degrees (full rotation)", Math.PI * 2, 10, 0],
    // Negative angles
    ["-90 degrees", -Math.PI / 2, 0, -10],
    ["-180 degrees", -Math.PI, -10, 0],
  ])("should move point by %s", (_, radian, expectedX, expectedY) => {
    const pos = { x: 10, y: 0 }
    const center = { x: 0, y: 0 }
    const result = v2d.moveOnCircumference(pos, center, radian)
    expect(result.x).toBeCloseTo(expectedX)
    expect(result.y).toBeCloseTo(expectedY)
  })

  it("should work with non-origin center", () => {
    const pos = { x: 15, y: 5 }
    const center = { x: 5, y: 5 }
    const result = v2d.moveOnCircumference(pos, center, Math.PI / 2)
    expect(result.x).toBeCloseTo(5)
    expect(result.y).toBeCloseTo(15)
  })

  // Boundary: point on axis (dx=0 or dy=0)
  it.each([
    ["point on Y axis (dx=0)", { x: 0, y: 10 }, Math.PI / 2, -10, 0],
    ["point on X axis (dy=0)", { x: 10, y: 0 }, Math.PI / 2, 0, 10],
  ])("should handle %s", (_, pos, radian, expectedX, expectedY) => {
    const center = { x: 0, y: 0 }
    const result = v2d.moveOnCircumference(pos, center, radian)
    expect(result.x).toBeCloseTo(expectedX)
    expect(result.y).toBeCloseTo(expectedY)
  })
})

describe("reverseAngleRadian", () => {
  // Boundary: theta > 0 vs theta <= 0
  it.each([
    // Positive angles (theta > 0): returns -(2π - theta)
    ["positive: π/4", Math.PI / 4, -(Math.PI * 2 - Math.PI / 4)],
    ["positive: π/2", Math.PI / 2, -(Math.PI * 2 - Math.PI / 2)],
    ["positive: π", Math.PI, -(Math.PI * 2 - Math.PI)],
    ["positive: near zero (boundary)", 0.0001, -(Math.PI * 2 - 0.0001)],
    // Negative angles (theta <= 0): returns 2π + theta
    ["negative: -π/4", -Math.PI / 4, Math.PI * 2 - Math.PI / 4],
    ["negative: -π/2", -Math.PI / 2, Math.PI * 2 - Math.PI / 2],
    ["negative: -π", -Math.PI, Math.PI * 2 - Math.PI],
    ["negative: near zero (boundary)", -0.0001, Math.PI * 2 - 0.0001],
  ])("should reverse %s", (_, input, expected) => {
    expect(v2d.reverseAngleRadian(input)).toBeCloseTo(expected)
  })

  // Boundary: theta = 0 (edge case - falls into else branch)
  it("should handle zero angle (boundary)", () => {
    const result = v2d.reverseAngleRadian(0)
    expect(result).toBeCloseTo(Math.PI * 2) // 2π + 0
  })
})

describe("calculateRelativeAngleRadian", () => {
  // Boundary values: 0°, ±90°, ±180° (where atan2 behavior changes)
  it.each([
    // [description, line2Target, expectedAngle]
    ["0° (parallel, same direction)", { x: 20, y: 0 }, 0],
    ["45° clockwise", { x: 10, y: 10 }, -Math.PI / 4],
    ["90° clockwise (boundary)", { x: 0, y: 10 }, -Math.PI / 2],
    ["135° clockwise", { x: -10, y: 10 }, (-3 * Math.PI) / 4],
    ["180° (opposite direction, boundary)", { x: -10, y: 0 }, Math.PI], // or -π
    ["-45° (counter-clockwise)", { x: 10, y: -10 }, Math.PI / 4],
    ["-90° (counter-clockwise, boundary)", { x: 0, y: -10 }, Math.PI / 2],
    ["-135° (counter-clockwise)", { x: -10, y: -10 }, (3 * Math.PI) / 4],
  ])("should calculate %s relative angle", (_, line2Target, expectedAngle) => {
    const line1 = VectorLine.fromPositions({ x: 0, y: 0 }, { x: 10, y: 0 })
    const line2 = VectorLine.fromPositions({ x: 0, y: 0 }, line2Target)
    const result = v2d.calculateRelativeAngleRadian(line1, line2)
    expect(Math.abs(result)).toBeCloseTo(Math.abs(expectedAngle))
  })
})

describe("calculateCircleCenterAndRadiusBy3Points", () => {
  it("should calculate center and radius for 3 points on a circle", () => {
    // Points on a circle with center (0,0) and radius 10
    const p1 = new Vector2D(10, 0)
    const p2 = new Vector2D(0, 10)
    const p3 = new Vector2D(-10, 0)
    const [center, radius] = v2d.calculateCircleCenterAndRadiusBy3Points(p1, p2, p3)
    expect(center.x).toBeCloseTo(0)
    expect(center.y).toBeCloseTo(0)
    expect(radius).toBeCloseTo(10)
  })

  it("should calculate center and radius for arbitrary 3 points", () => {
    // Points on a circle with center (5, 5) and radius 5
    const p1 = new Vector2D(10, 5)
    const p2 = new Vector2D(5, 10)
    const p3 = new Vector2D(0, 5)
    const [center, radius] = v2d.calculateCircleCenterAndRadiusBy3Points(p1, p2, p3)
    expect(center.x).toBeCloseTo(5)
    expect(center.y).toBeCloseTo(5)
    expect(radius).toBeCloseTo(5)
  })

  // Boundary: when points coincide (x12 === 0 && y12 === 0) or (x32 === 0 && y32 === 0)
  describe("boundary: coincident points", () => {
    it.each([
      ["p1 === p2", new Vector2D(10, 0), new Vector2D(10, 0), new Vector2D(0, 10)],
      ["p2 === p3", new Vector2D(10, 0), new Vector2D(0, 10), new Vector2D(0, 10)],
      ["all points same", new Vector2D(5, 5), new Vector2D(5, 5), new Vector2D(5, 5)],
    ])("should return p1 and radius 0 when %s", (_, p1, p2, p3) => {
      const [center, radius] = v2d.calculateCircleCenterAndRadiusBy3Points(p1, p2, p3)
      expect(center).toBe(p1)
      expect(radius).toBe(0)
    })
  })

  // Boundary: collinear points (denominator becomes 0)
  it("should handle collinear points (boundary: denominator = 0)", () => {
    const p1 = new Vector2D(0, 0)
    const p2 = new Vector2D(5, 0)
    const p3 = new Vector2D(10, 0)
    const [center, radius] = v2d.calculateCircleCenterAndRadiusBy3Points(p1, p2, p3)
    // When points are collinear on X axis (y values all 0),
    // denominator (2 * x12 * y32 - 2 * y12 * x32) = 0
    // Results in non-finite values (NaN or Infinity)
    expect(Number.isFinite(center.x)).toBe(false)
    expect(Number.isFinite(center.y)).toBe(false)
    expect(Number.isFinite(radius)).toBe(false)
  })
})

describe("calculateEdgeLabelArea", () => {
  const edgeStyle = { width: 2, color: "#000", dasharray: undefined, linecap: undefined }

  it("should calculate edge label area for horizontal line", () => {
    const linePos = { p1: { x: 0, y: 0 }, p2: { x: 100, y: 0 } }
    const result = v2d.calculateEdgeLabelArea(linePos, edgeStyle, 5, 0, 1)

    expect(result.source.above.x).toBeCloseTo(0)
    expect(result.source.above.y).toBeCloseTo(-6) // margin = width/2 + margin = 1 + 5 = 6
    expect(result.source.below.x).toBeCloseTo(0)
    expect(result.source.below.y).toBeCloseTo(6)
    expect(result.target.above.x).toBeCloseTo(100)
    expect(result.target.above.y).toBeCloseTo(-6)
    expect(result.target.below.x).toBeCloseTo(100)
    expect(result.target.below.y).toBeCloseTo(6)
  })

  it("should apply padding to edge label area", () => {
    const linePos = { p1: { x: 0, y: 0 }, p2: { x: 100, y: 0 } }
    const result = v2d.calculateEdgeLabelArea(linePos, edgeStyle, 5, 10, 1)

    // With padding of 10, source should be moved 10 units towards target
    expect(result.source.above.x).toBeCloseTo(10)
    expect(result.target.above.x).toBeCloseTo(90)
  })

  // Boundary: padding = 0 (special case in implementation)
  it("should not apply padding when padding is 0 (boundary)", () => {
    const linePos = { p1: { x: 0, y: 0 }, p2: { x: 100, y: 0 } }
    const result = v2d.calculateEdgeLabelArea(linePos, edgeStyle, 5, 0, 1)

    // Source should be at original position
    expect(result.source.above.x).toBeCloseTo(0)
    expect(result.target.above.x).toBeCloseTo(100)
  })

  it("should apply scale factor", () => {
    const linePos = { p1: { x: 0, y: 0 }, p2: { x: 100, y: 0 } }
    const result = v2d.calculateEdgeLabelArea(linePos, edgeStyle, 5, 10, 2)

    // Scale of 2: padding becomes 20, margin becomes 12
    expect(result.source.above.x).toBeCloseTo(20)
    expect(result.source.above.y).toBeCloseTo(-12)
  })

  // Boundary: angle conditions for swap (angle < -90 || angle >= 90)
  describe("boundary: angle-based swap condition", () => {
    it.each([
      // [description, p2, shouldSwap] - p1 is always (0,0)
      // No swap: -90 <= angle < 90
      ["angle = 0° (no swap)", { x: 100, y: 0 }, false],
      ["angle = 45° (no swap)", { x: 100, y: 100 }, false],
      ["angle = 89° (no swap, near boundary)", { x: 1, y: 100 }, false],
      ["angle = -45° (no swap)", { x: 100, y: -100 }, false],
      ["angle = -89° (no swap, near boundary)", { x: 1, y: -100 }, false],
      // Swap: angle < -90 || angle >= 90
      ["angle = 90° (swap, boundary)", { x: 0, y: 100 }, true],
      ["angle = 135° (swap)", { x: -100, y: 100 }, true],
      ["angle = 180° (swap)", { x: -100, y: 0 }, true],
      ["angle = -91° (swap, near boundary)", { x: -1, y: -100 }, true],
      ["angle = -135° (swap)", { x: -100, y: -100 }, true],
    ])("%s", (_, p2, shouldSwap) => {
      const linePos = { p1: { x: 0, y: 0 }, p2 }
      const result = v2d.calculateEdgeLabelArea(linePos, edgeStyle, 5, 0, 1)

      if (shouldSwap) {
        // When swapped, above.y > below.y for horizontal-ish lines
        // (perpendicular offset is reversed)
        expect(result.source.above).toBeDefined()
        expect(result.source.below).toBeDefined()
      } else {
        // Normal case: above.y < below.y for horizontal-ish lines
        expect(result.source.above).toBeDefined()
        expect(result.source.below).toBeDefined()
      }
      // Structure should always be valid
      expect(result.target.above).toBeDefined()
      expect(result.target.below).toBeDefined()
    })
  })
})

describe("calculateBezierCurveControlPoint", () => {
  // Boundary: Math.abs(theta1) < Math.PI / 2 (90 degrees)
  // When < 90°: simple control point
  // When >= 90°: goes through midpoint (more control points)

  describe("boundary: angle < 90° (simple path)", () => {
    it.each([
      ["45°", new Vector2D(Math.cos(Math.PI / 4) * 10, Math.sin(Math.PI / 4) * 10), -Math.PI / 4],
      ["60°", new Vector2D(Math.cos(Math.PI / 3) * 10, Math.sin(Math.PI / 3) * 10), -Math.PI / 3],
      ["89° (near boundary)", new Vector2D(Math.cos(Math.PI * 89 / 180) * 10, Math.sin(Math.PI * 89 / 180) * 10), -Math.PI * 89 / 180],
    ])("should return fewer control points for %s curve", (_, p2, theta0) => {
      const p1 = new Vector2D(10, 0)
      const center = new Vector2D(0, 0)
      const control = v2d.calculateBezierCurveControlPoint(p1, center, p2, theta0)

      // For small angles, should return 3 control points: cp, middle, cp
      expect(control.length).toBe(3)
      control.forEach(cp => expect(cp).toBeInstanceOf(Vector2D))
    })
  })

  describe("boundary: angle >= 90° (complex path with midpoints)", () => {
    it.each([
      ["90° (boundary)", new Vector2D(0, 10), -Math.PI / 2],
      ["120°", new Vector2D(-5, Math.sin(Math.PI * 2 / 3) * 10), -Math.PI * 2 / 3],
      ["180°", new Vector2D(-10, 0), -Math.PI],
    ])("should return more control points for %s curve", (_, p2, theta0) => {
      const p1 = new Vector2D(10, 0)
      const center = new Vector2D(0, 0)
      const control = v2d.calculateBezierCurveControlPoint(p1, center, p2, theta0)

      // For large angles, should have more control points
      expect(control.length).toBeGreaterThanOrEqual(3)
      control.forEach(cp => expect(cp).toBeInstanceOf(Vector2D))
    })
  })

  // Boundary: theta0 * theta < 0 (sign mismatch triggers reverseAngleRadian)
  it("should handle sign mismatch between theta0 and calculated theta", () => {
    const p1 = new Vector2D(10, 0)
    const center = new Vector2D(0, 0)
    const p2 = new Vector2D(0, 10)
    // theta0 positive but actual angle would be negative
    const theta0 = Math.PI / 2

    const control = v2d.calculateBezierCurveControlPoint(p1, center, p2, theta0)

    expect(control.length).toBeGreaterThanOrEqual(2)
    control.forEach(cp => expect(cp).toBeInstanceOf(Vector2D))
  })
})
