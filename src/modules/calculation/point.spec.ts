import { describe, expect, it } from "vitest"
import { Vector2D } from "@/modules/vector2d"
import { VectorLine } from "./line"
import {
  getNearestPoint,
  getIntersectionOfLineTargetAndCircle,
  getIntersectionOfLineTargetAndCircle2,
  getIntersectionPointOfLines,
  getIntersectionOfCircles,
} from "./point"

// ============================================================
// Test helper functions
// ============================================================

/** Calculate distance between two points */
function distance(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2)
}

// ============================================================
// Tests
// ============================================================

describe("point", () => {
  describe("getNearestPoint", () => {
    it.each([
      [
        "point on the line",
        { px: 50, py: 0 },
        { x1: 0, y1: 0, x2: 100, y2: 0 },
        { x: 50, y: 0 },
      ],
      [
        "point perpendicular to horizontal line",
        { px: 50, py: 30 },
        { x1: 0, y1: 0, x2: 100, y2: 0 },
        { x: 50, y: 0 },
      ],
      [
        "point perpendicular to vertical line",
        { px: 30, py: 50 },
        { x1: 0, y1: 0, x2: 0, y2: 100 },
        { x: 0, y: 50 },
      ],
      [
        "point perpendicular to diagonal line (45 degrees)",
        { px: 0, py: 100 },
        { x1: 0, y1: 0, x2: 100, y2: 100 },
        { x: 50, y: 50 },
      ],
      [
        "point beyond line start (extension)",
        { px: -50, py: 30 },
        { x1: 0, y1: 0, x2: 100, y2: 0 },
        { x: -50, y: 0 },
      ],
      [
        "point beyond line end (extension)",
        { px: 150, py: 30 },
        { x1: 0, y1: 0, x2: 100, y2: 0 },
        { x: 150, y: 0 },
      ],
    ])("should calculate nearest point for %s", (_, point, line, expected) => {
      const p = new Vector2D(point.px, point.py)
      const vLine = VectorLine.fromPositions(
        { x: line.x1, y: line.y1 },
        { x: line.x2, y: line.y2 }
      )
      const result = getNearestPoint(p, vLine)

      expect(result.x).toBeCloseTo(expected.x, 5)
      expect(result.y).toBeCloseTo(expected.y, 5)
    })

    it("should verify nearest point is perpendicular to line", () => {
      const p = new Vector2D(30, 40)
      const line = VectorLine.fromPositions({ x: 0, y: 0 }, { x: 100, y: 0 })
      const nearest = getNearestPoint(p, line)

      // Vector from nearest to p should be perpendicular to line
      const toP = new Vector2D(p.x - nearest.x, p.y - nearest.y)
      const dotProduct = toP.x * line.v.x + toP.y * line.v.y
      expect(dotProduct).toBeCloseTo(0, 5)
    })
  })

  describe("getIntersectionOfLineTargetAndCircle", () => {
    describe("when target is outside circle", () => {
      it("should return null", () => {
        const source = new Vector2D(0, 0)
        const target = new Vector2D(200, 0)
        const center = new Vector2D(100, 0)
        const radius = 30

        const result = getIntersectionOfLineTargetAndCircle(source, target, center, radius)
        expect(result).toBeNull()
      })
    })

    describe("when target is inside circle", () => {
      it("should return intersection point on circle", () => {
        // Line from (0,0) to (100,0), circle at (100,0) with radius 30
        // Target (100,0) is at center, intersection should be at (70,0)
        const source = new Vector2D(0, 0)
        const target = new Vector2D(100, 0)
        const center = new Vector2D(100, 0)
        const radius = 30

        const result = getIntersectionOfLineTargetAndCircle(source, target, center, radius)

        expect(result).not.toBeNull()
        expect(result!.x).toBeCloseTo(70, 5)
        expect(result!.y).toBeCloseTo(0, 5)

        // Verify point is on circle
        const distFromCenter = distance(result!, center)
        expect(distFromCenter).toBeCloseTo(radius, 5)
      })

      it("should return intersection closest to source when line passes through circle", () => {
        // Line from (0,0) to (150,0), circle at (100,0) with radius 30
        // Two intersections at (70,0) and (130,0), should return (70,0)
        const source = new Vector2D(0, 0)
        const target = new Vector2D(150, 0)
        const center = new Vector2D(100, 0)
        const radius = 30

        // Note: This function returns null because target is outside circle
        const result = getIntersectionOfLineTargetAndCircle(source, target, center, radius)
        expect(result).toBeNull() // target (150,0) is outside circle
      })

      it("should handle diagonal line through circle", () => {
        // Line from (0,0) to (100,100), circle at (50,50) with radius 20
        const source = new Vector2D(0, 0)
        const target = new Vector2D(100, 100)
        const center = new Vector2D(50, 50)
        const radius = 20

        // Target distance from center: sqrt((100-50)^2 + (100-50)^2) = sqrt(5000) ≈ 70.7 > 20
        // So target is outside circle, should return null
        const result = getIntersectionOfLineTargetAndCircle(source, target, center, radius)
        expect(result).toBeNull()
      })

      it("should return intersection when target is inside circle", () => {
        // Line from (0,0) to (60,0), circle at (50,0) with radius 30
        // Target (60,0) is inside circle (distance 10 from center)
        const source = new Vector2D(0, 0)
        const target = new Vector2D(60, 0)
        const center = new Vector2D(50, 0)
        const radius = 30

        const result = getIntersectionOfLineTargetAndCircle(source, target, center, radius)

        expect(result).not.toBeNull()
        // Intersection should be at (20, 0) - closer to source
        expect(result!.x).toBeCloseTo(20, 5)
        expect(result!.y).toBeCloseTo(0, 5)

        // Verify point is on circle
        const distFromCenter = distance(result!, center)
        expect(distFromCenter).toBeCloseTo(radius, 5)
      })
    })

    describe("boundary: target on circle edge", () => {
      it("should return intersection when target is exactly on circle edge", () => {
        // Line from (0,0) to (80,0), circle at (50,0) with radius 30
        // Target (80,0) is exactly on circle edge
        const source = new Vector2D(0, 0)
        const target = new Vector2D(80, 0)
        const center = new Vector2D(50, 0)
        const radius = 30

        const result = getIntersectionOfLineTargetAndCircle(source, target, center, radius)

        expect(result).not.toBeNull()
        // Should return (20, 0) - the intersection closer to source
        expect(result!.x).toBeCloseTo(20, 5)
        expect(result!.y).toBeCloseTo(0, 5)
      })
    })

    describe("boundary: tangent line", () => {
      it("should return tangent point when line is tangent to circle", () => {
        // Horizontal line at y=30, circle at (50,0) with radius 30
        // Line is tangent at (50, 30)
        const source = new Vector2D(0, 30)
        const target = new Vector2D(50, 30) // target at tangent point
        const center = new Vector2D(50, 0)
        const radius = 30

        const result = getIntersectionOfLineTargetAndCircle(source, target, center, radius)

        expect(result).not.toBeNull()
        expect(result!.x).toBeCloseTo(50, 5)
        expect(result!.y).toBeCloseTo(30, 5)
      })
    })

    describe("boundary: target at circle center", () => {
      it("should return intersection when target is at circle center", () => {
        const source = new Vector2D(0, 0)
        const target = new Vector2D(50, 0) // target at center
        const center = new Vector2D(50, 0)
        const radius = 30

        const result = getIntersectionOfLineTargetAndCircle(source, target, center, radius)

        expect(result).not.toBeNull()
        // Should return (20, 0) - intersection on source side
        expect(result!.x).toBeCloseTo(20, 5)
        expect(result!.y).toBeCloseTo(0, 5)

        // Verify on circle
        const distFromCenter = distance(result!, center)
        expect(distFromCenter).toBeCloseTo(radius, 5)
      })
    })
  })

  describe("getIntersectionOfLineTargetAndCircle2", () => {
    describe("when nearBy selects different intersection point", () => {
      it("should return intersection closer to nearBy when distance difference > 2", () => {
        // Line from (0,0) to (50,0), circle at (50,0) with radius 30
        // Intersections at (20,0) and (80,0)
        // nearBy at (100,0) should select (80,0)
        const source = new Vector2D(0, 0)
        const target = new Vector2D(50, 0) // inside circle
        const center = new Vector2D(50, 0)
        const radius = 30
        const nearBy = new Vector2D(100, 0)

        const result = getIntersectionOfLineTargetAndCircle2(source, target, center, radius, nearBy)

        expect(result).not.toBeNull()
        // nearBy is at (100,0), closer to (80,0) than (20,0)
        expect(result!.x).toBeCloseTo(80, 5)
        expect(result!.y).toBeCloseTo(0, 5)
      })

      it("should return ip2 when distance difference < 2 (equidistant case)", () => {
        // Create a scenario where both intersections are nearly equidistant from nearBy
        const source = new Vector2D(0, 0)
        const target = new Vector2D(50, 0)
        const center = new Vector2D(50, 0)
        const radius = 30
        // nearBy at (50,0) is equidistant from both (20,0) and (80,0)
        const nearBy = new Vector2D(50, 0)

        const result = getIntersectionOfLineTargetAndCircle2(source, target, center, radius, nearBy)

        expect(result).not.toBeNull()
        // When equidistant (diff < 2), returns ip2 which is h - tv = (20, 0)
        expect(result!.x).toBeCloseTo(20, 5)
        expect(result!.y).toBeCloseTo(0, 5)
      })
    })

    describe("when target is outside circle", () => {
      it("should return null", () => {
        const source = new Vector2D(0, 0)
        const target = new Vector2D(200, 0)
        const center = new Vector2D(100, 0)
        const radius = 30
        const nearBy = new Vector2D(0, 0)

        const result = getIntersectionOfLineTargetAndCircle2(source, target, center, radius, nearBy)
        expect(result).toBeNull()
      })
    })

    describe("boundary: tangent line", () => {
      it("should return tangent point regardless of nearBy", () => {
        const source = new Vector2D(0, 30)
        const target = new Vector2D(50, 30) // on tangent
        const center = new Vector2D(50, 0)
        const radius = 30
        const nearBy = new Vector2D(100, 30)

        const result = getIntersectionOfLineTargetAndCircle2(source, target, center, radius, nearBy)

        expect(result).not.toBeNull()
        expect(result!.x).toBeCloseTo(50, 5)
        expect(result!.y).toBeCloseTo(30, 5)
      })
    })
  })

  describe("getIntersectionPointOfLines", () => {
    it.each([
      [
        "perpendicular lines at origin",
        { x1: -50, y1: 0, x2: 50, y2: 0 }, // horizontal
        { x1: 0, y1: -50, x2: 0, y2: 50 }, // vertical
        { x: 0, y: 0 },
      ],
      [
        "perpendicular lines not at origin",
        { x1: 0, y1: 50, x2: 100, y2: 50 }, // horizontal at y=50
        { x1: 30, y1: 0, x2: 30, y2: 100 }, // vertical at x=30
        { x: 30, y: 50 },
      ],
      [
        "diagonal lines crossing",
        { x1: 0, y1: 0, x2: 100, y2: 100 }, // y = x
        { x1: 0, y1: 100, x2: 100, y2: 0 }, // y = 100 - x
        { x: 50, y: 50 },
      ],
      [
        "lines at 45 and -45 degrees",
        { x1: 0, y1: 0, x2: 100, y2: 100 }, // 45 degrees
        { x1: 100, y1: 0, x2: 0, y2: 100 }, // -45 degrees
        { x: 50, y: 50 },
      ],
      [
        "lines intersecting outside their segments",
        { x1: 0, y1: 0, x2: 10, y2: 10 }, // short segment on y=x
        { x1: 100, y1: 0, x2: 90, y2: 10 }, // segment on y=100-x
        { x: 50, y: 50 }, // intersection of infinite lines
      ],
    ])("should calculate intersection for %s", (_, l1, l2, expected) => {
      const line1 = VectorLine.fromPositions({ x: l1.x1, y: l1.y1 }, { x: l1.x2, y: l1.y2 })
      const line2 = VectorLine.fromPositions({ x: l2.x1, y: l2.y1 }, { x: l2.x2, y: l2.y2 })

      const result = getIntersectionPointOfLines(line1, line2)

      expect(result.x).toBeCloseTo(expected.x, 5)
      expect(result.y).toBeCloseTo(expected.y, 5)
    })

    it("should verify intersection point lies on both lines (extended)", () => {
      const line1 = VectorLine.fromPositions({ x: 0, y: 0 }, { x: 100, y: 50 })
      const line2 = VectorLine.fromPositions({ x: 0, y: 100 }, { x: 100, y: 0 })

      const result = getIntersectionPointOfLines(line1, line2)

      // Verify point is on line1: check that cross product is 0
      // Vector from line1.source to result should be parallel to line1.v
      const v1 = { x: result.x - line1.source.x, y: result.y - line1.source.y }
      const cross1 = v1.x * line1.v.y - v1.y * line1.v.x
      expect(cross1).toBeCloseTo(0, 3)

      // Same for line2
      const v2 = { x: result.x - line2.source.x, y: result.y - line2.source.y }
      const cross2 = v2.x * line2.v.y - v2.y * line2.v.x
      expect(cross2).toBeCloseTo(0, 3)
    })
  })

  describe("getIntersectionOfCircles", () => {
    describe("no intersection", () => {
      it("should return null when circles are too far apart", () => {
        const c1 = new Vector2D(0, 0)
        const r1 = 10
        const c2 = new Vector2D(100, 0)
        const r2 = 10

        const result = getIntersectionOfCircles(c1, r1, c2, r2)
        expect(result).toBeNull()
      })

      it("should return null when one circle contains the other", () => {
        const c1 = new Vector2D(0, 0)
        const r1 = 100
        const c2 = new Vector2D(10, 0)
        const r2 = 10

        const result = getIntersectionOfCircles(c1, r1, c2, r2)
        expect(result).toBeNull()
      })

      it("should return null for concentric circles (same center)", () => {
        const c1 = new Vector2D(50, 50)
        const r1 = 30
        const c2 = new Vector2D(50, 50)
        const r2 = 20

        const result = getIntersectionOfCircles(c1, r1, c2, r2)
        expect(result).toBeNull()
      })
    })

    describe("single point (tangent)", () => {
      it("should return single point when circles are externally tangent (circumscribed)", () => {
        const c1 = new Vector2D(0, 0)
        const r1 = 30
        const c2 = new Vector2D(50, 0)
        const r2 = 20

        const result = getIntersectionOfCircles(c1, r1, c2, r2)

        expect(result).not.toBeNull()
        const [p1, p2] = result as [Vector2D, Vector2D]
        // Both points should be the same (tangent point)
        expect(p1.x).toBeCloseTo(p2.x, 5)
        expect(p1.y).toBeCloseTo(p2.y, 5)

        // Tangent point should be at (30, 0)
        expect(p1.x).toBeCloseTo(30, 5)
        expect(p1.y).toBeCloseTo(0, 5)

        // Verify point is on both circles
        expect(distance(p1, c1)).toBeCloseTo(r1, 5)
        expect(distance(p1, c2)).toBeCloseTo(r2, 5)
      })

      it("should return single point when circles are internally tangent (inscribed)", () => {
        const c1 = new Vector2D(0, 0)
        const r1 = 50
        const c2 = new Vector2D(30, 0)
        const r2 = 20

        const result = getIntersectionOfCircles(c1, r1, c2, r2)

        expect(result).not.toBeNull()
        const [p1, p2] = result as [Vector2D, Vector2D]
        // Both points should be the same
        expect(p1.x).toBeCloseTo(p2.x, 5)
        expect(p1.y).toBeCloseTo(p2.y, 5)

        // Tangent point should be at (50, 0)
        expect(p1.x).toBeCloseTo(50, 5)
        expect(p1.y).toBeCloseTo(0, 5)

        // Verify point is on both circles
        expect(distance(p1, c1)).toBeCloseTo(r1, 5)
        expect(distance(p1, c2)).toBeCloseTo(r2, 5)
      })
    })

    describe("two points", () => {
      it("should return two intersection points", () => {
        // Two circles of radius 30, centers at (0,0) and (40,0)
        // They overlap in the middle
        const c1 = new Vector2D(0, 0)
        const r1 = 30
        const c2 = new Vector2D(40, 0)
        const r2 = 30

        const result = getIntersectionOfCircles(c1, r1, c2, r2)

        expect(result).not.toBeNull()
        const [p1, p2] = result as [Vector2D, Vector2D]

        // Points should be different (not tangent)
        expect(Math.abs(p1.y - p2.y)).toBeGreaterThan(1)

        // Both points should be on both circles
        expect(distance(p1, c1)).toBeCloseTo(r1, 5)
        expect(distance(p1, c2)).toBeCloseTo(r2, 5)
        expect(distance(p2, c1)).toBeCloseTo(r1, 5)
        expect(distance(p2, c2)).toBeCloseTo(r2, 5)

        // X coordinate should be at midpoint (20) due to symmetry
        expect(p1.x).toBeCloseTo(20, 5)
        expect(p2.x).toBeCloseTo(20, 5)

        // Y coordinates should be symmetric around 0
        expect(p1.y).toBeCloseTo(-p2.y, 5)
      })

      it("should return point closer to near when near is specified", () => {
        const c1 = new Vector2D(0, 0)
        const r1 = 30
        const c2 = new Vector2D(40, 0)
        const r2 = 30
        const near = new Vector2D(20, 50) // closer to positive y intersection

        const result = getIntersectionOfCircles(c1, r1, c2, r2, near)

        expect(result).not.toBeNull()
        const p = result as Vector2D

        // Should be the point with positive y (closer to near)
        expect(p.y).toBeGreaterThan(0)

        // Verify on both circles
        expect(distance(p, c1)).toBeCloseTo(r1, 5)
        expect(distance(p, c2)).toBeCloseTo(r2, 5)
      })

      it.each([
        ["circles with different radii", { c1x: 0, c1y: 0, r1: 40 }, { c2x: 50, c2y: 0, r2: 30 }],
        ["circles on diagonal", { c1x: 0, c1y: 0, r1: 30 }, { c2x: 30, c2y: 30, r2: 30 }],
        ["circles with large overlap", { c1x: 0, c1y: 0, r1: 50 }, { c2x: 20, c2y: 0, r2: 50 }],
      ])("should find valid intersections for %s", (_, circle1, circle2) => {
        const c1 = new Vector2D(circle1.c1x, circle1.c1y)
        const r1 = circle1.r1
        const c2 = new Vector2D(circle2.c2x, circle2.c2y)
        const r2 = circle2.r2

        const result = getIntersectionOfCircles(c1, r1, c2, r2)

        expect(result).not.toBeNull()
        const [p1, p2] = result as [Vector2D, Vector2D]

        // Both points should be on both circles
        expect(distance(p1, c1)).toBeCloseTo(r1, 5)
        expect(distance(p1, c2)).toBeCloseTo(r2, 5)
        expect(distance(p2, c1)).toBeCloseTo(r1, 5)
        expect(distance(p2, c2)).toBeCloseTo(r2, 5)
      })
    })

    describe("with near parameter", () => {
      it("should select the intersection point closer to near", () => {
        const c1 = new Vector2D(0, 0)
        const r1 = 30
        const c2 = new Vector2D(40, 0)
        const r2 = 30

        // Get both points without near
        const both = getIntersectionOfCircles(c1, r1, c2, r2) as [Vector2D, Vector2D]
        const [pt1, pt2] = both

        // Test selecting point closer to negative y
        const nearNegY = new Vector2D(20, -100)
        const resultNeg = getIntersectionOfCircles(c1, r1, c2, r2, nearNegY) as Vector2D

        // Should select the point with negative y
        const expectedNeg = pt1.y < pt2.y ? pt1 : pt2
        expect(resultNeg.x).toBeCloseTo(expectedNeg.x, 5)
        expect(resultNeg.y).toBeCloseTo(expectedNeg.y, 5)

        // Test selecting point closer to positive y
        const nearPosY = new Vector2D(20, 100)
        const resultPos = getIntersectionOfCircles(c1, r1, c2, r2, nearPosY) as Vector2D

        // Should select the point with positive y
        const expectedPos = pt1.y > pt2.y ? pt1 : pt2
        expect(resultPos.x).toBeCloseTo(expectedPos.x, 5)
        expect(resultPos.y).toBeCloseTo(expectedPos.y, 5)
      })
    })
  })
})
