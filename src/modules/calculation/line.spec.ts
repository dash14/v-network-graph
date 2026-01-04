import { describe, expect, it } from "vitest"
import { Vector2D } from "@/modules/vector2d"
import {
  VectorLine,
  toLineVector,
  toVectorsFromLinePosition,
  getCenterOfLinePosition,
  toLinePosition,
  applyMargin,
  inverseLine,
  calculatePerpendicularLine,
} from "./line"

describe("line", () => {
  describe("VectorLine", () => {
    describe("fromLinePosition", () => {
      it("should create VectorLine from LinePosition", () => {
        const linePos = { p1: { x: 0, y: 0 }, p2: { x: 100, y: 50 } }
        const result = VectorLine.fromLinePosition(linePos)

        expect(result.source.x).toBe(0)
        expect(result.source.y).toBe(0)
        expect(result.target.x).toBe(100)
        expect(result.target.y).toBe(50)
        expect(result.v.x).toBe(100)
        expect(result.v.y).toBe(50)
      })
    })

    describe("fromPositions", () => {
      it("should create VectorLine from two Positions", () => {
        const result = VectorLine.fromPositions({ x: 10, y: 20 }, { x: 30, y: 40 })

        expect(result.source.x).toBe(10)
        expect(result.source.y).toBe(20)
        expect(result.target.x).toBe(30)
        expect(result.target.y).toBe(40)
        expect(result.v.x).toBe(20)
        expect(result.v.y).toBe(20)
      })
    })

    describe("fromVectors", () => {
      it("should create VectorLine from two Vector2D", () => {
        const source = new Vector2D(5, 10)
        const target = new Vector2D(15, 30)
        const result = VectorLine.fromVectors(source, target)

        expect(result.source).toBe(source)
        expect(result.target).toBe(target)
        expect(result.v.x).toBe(10)
        expect(result.v.y).toBe(20)
      })
    })
  })

  describe("toLineVector", () => {
    it.each([
      ["horizontal line", { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 0 }],
      ["vertical line", { x: 0, y: 0 }, { x: 0, y: 100 }, { x: 0, y: 100 }],
      ["diagonal line", { x: 0, y: 0 }, { x: 50, y: 50 }, { x: 50, y: 50 }],
      ["same point (boundary)", { x: 10, y: 10 }, { x: 10, y: 10 }, { x: 0, y: 0 }],
      ["negative to positive", { x: -50, y: -50 }, { x: 50, y: 50 }, { x: 100, y: 100 }],
      ["reverse direction", { x: 100, y: 100 }, { x: 0, y: 0 }, { x: -100, y: -100 }],
    ])("should calculate %s", (_, source, target, expected) => {
      const result = toLineVector(
        new Vector2D(source.x, source.y),
        new Vector2D(target.x, target.y)
      )
      expect(result.x).toBeCloseTo(expected.x, 5)
      expect(result.y).toBeCloseTo(expected.y, 5)
    })
  })

  describe("toVectorsFromLinePosition", () => {
    it("should convert LinePosition to tuple of Vector2D", () => {
      const linePos = { p1: { x: 10, y: 20 }, p2: { x: 30, y: 40 } }
      const [v1, v2] = toVectorsFromLinePosition(linePos)

      expect(v1.x).toBe(10)
      expect(v1.y).toBe(20)
      expect(v2.x).toBe(30)
      expect(v2.y).toBe(40)
    })
  })

  describe("getCenterOfLinePosition", () => {
    it.each([
      ["standard line", { x: 0, y: 0 }, { x: 100, y: 100 }, { x: 50, y: 50 }],
      ["same point (boundary)", { x: 50, y: 50 }, { x: 50, y: 50 }, { x: 50, y: 50 }],
      ["negative coordinates", { x: -100, y: 0 }, { x: 100, y: 0 }, { x: 0, y: 0 }],
      ["mixed coordinates", { x: -50, y: 25 }, { x: 50, y: 75 }, { x: 0, y: 50 }],
    ])("should calculate center for %s", (_, p1, p2, expected) => {
      const result = getCenterOfLinePosition({ p1, p2 })
      expect(result.x).toBeCloseTo(expected.x, 5)
      expect(result.y).toBeCloseTo(expected.y, 5)
    })
  })

  describe("toLinePosition", () => {
    it("should convert two Positions to LinePosition", () => {
      const p1 = { x: 10, y: 20 }
      const p2 = { x: 30, y: 40 }
      const result = toLinePosition(p1, p2)

      expect(result.p1).toBe(p1)
      expect(result.p2).toBe(p2)
    })
  })

  describe("applyMargin", () => {
    // Helper: calculate distance between two points
    function distance(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
      return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2)
    }

    describe("normal cases", () => {
      // Horizontal line from (0,0) to (100,0), length = 100
      const linePos = { p1: { x: 0, y: 0 }, p2: { x: 100, y: 0 } }

      it("should not change line when both margins are 0", () => {
        const result = applyMargin(linePos, 0, 0)
        expect(result.p1.x).toBeCloseTo(0, 5)
        expect(result.p1.y).toBeCloseTo(0, 5)
        expect(result.p2.x).toBeCloseTo(100, 5)
        expect(result.p2.y).toBeCloseTo(0, 5)
      })

      it("should move p1 when only sourceMargin is applied", () => {
        const result = applyMargin(linePos, 10, 0)
        expect(result.p1.x).toBeCloseTo(10, 5)
        expect(result.p1.y).toBeCloseTo(0, 5)
        expect(result.p2.x).toBeCloseTo(100, 5)
        expect(result.p2.y).toBeCloseTo(0, 5)
      })

      it("should move p2 when only targetMargin is applied", () => {
        const result = applyMargin(linePos, 0, 10)
        expect(result.p1.x).toBeCloseTo(0, 5)
        expect(result.p1.y).toBeCloseTo(0, 5)
        expect(result.p2.x).toBeCloseTo(90, 5)
        expect(result.p2.y).toBeCloseTo(0, 5)
      })

      it("should move both ends when both margins are applied", () => {
        const result = applyMargin(linePos, 10, 10)
        expect(result.p1.x).toBeCloseTo(10, 5)
        expect(result.p1.y).toBeCloseTo(0, 5)
        expect(result.p2.x).toBeCloseTo(90, 5)
        expect(result.p2.y).toBeCloseTo(0, 5)
      })

      it("should handle asymmetric margins", () => {
        const result = applyMargin(linePos, 30, 20)
        expect(result.p1.x).toBeCloseTo(30, 5)
        expect(result.p2.x).toBeCloseTo(80, 5)
      })
    })

    describe("diagonal line", () => {
      // Diagonal line from (0,0) to (100,100), length = sqrt(2) * 100 ≈ 141.42
      const linePos = { p1: { x: 0, y: 0 }, p2: { x: 100, y: 100 } }
      const lineLength = Math.sqrt(2) * 100

      it("should apply margin along the line direction", () => {
        const margin = 10
        const result = applyMargin(linePos, margin, margin)

        // p1 should move along the line by margin
        const p1Dist = distance({ x: 0, y: 0 }, result.p1)
        expect(p1Dist).toBeCloseTo(margin, 1)

        // p2 should move toward p1 by margin
        const p2Dist = distance({ x: 100, y: 100 }, result.p2)
        expect(p2Dist).toBeCloseTo(margin, 1)

        // Resulting line length should be reduced
        const resultLength = distance(result.p1, result.p2)
        expect(resultLength).toBeCloseTo(lineLength - 2 * margin, 1)
      })
    })

    describe("boundary: margin sum equals line length", () => {
      const linePos = { p1: { x: 0, y: 0 }, p2: { x: 100, y: 0 } }

      it("should converge to center point when margins sum to line length", () => {
        const result = applyMargin(linePos, 50, 50)
        // Both points should be at or very close to center (50, 0)
        expect(result.p1.x).toBeCloseTo(50, 0)
        expect(result.p2.x).toBeCloseTo(50, 0)
      })
    })

    describe("boundary: margin sum exceeds line length (reversal)", () => {
      // Use vertical line because reversal detection uses angle comparison
      // which requires non-zero angles for proper detection
      const linePos = { p1: { x: 0, y: 0 }, p2: { x: 0, y: 100 } }

      it("should handle reversal when margins exceed line length", () => {
        const result = applyMargin(linePos, 60, 60)
        // When reversed, returns a minimal line segment at center
        // The implementation creates a 0.5 length line from center
        const centerY = 50
        expect(result.p1.x).toBeCloseTo(0, 5)
        expect(result.p2.x).toBeCloseTo(0, 5)
        expect(result.p1.y).toBeCloseTo(centerY, 0)
        expect(result.p2.y).toBeCloseTo(centerY + 0.5, 0)
      })
    })

    describe("boundary: negative margins", () => {
      const linePos = { p1: { x: 0, y: 0 }, p2: { x: 100, y: 0 } }

      it("should extend line outward with negative margins", () => {
        const result = applyMargin(linePos, -10, -10)
        // Negative margins should extend the line outward
        expect(result.p1.x).toBeCloseTo(-10, 5)
        expect(result.p2.x).toBeCloseTo(110, 5)
      })
    })
  })

  describe("inverseLine", () => {
    it("should swap p1 and p2", () => {
      const line = { p1: { x: 10, y: 20 }, p2: { x: 30, y: 40 } }
      const result = inverseLine(line)

      expect(result.p1).toBe(line.p2)
      expect(result.p2).toBe(line.p1)
    })

    it("should return same result for same point line", () => {
      const line = { p1: { x: 50, y: 50 }, p2: { x: 50, y: 50 } }
      const result = inverseLine(line)

      expect(result.p1.x).toBe(50)
      expect(result.p1.y).toBe(50)
      expect(result.p2.x).toBe(50)
      expect(result.p2.y).toBe(50)
    })
  })

  describe("calculatePerpendicularLine", () => {
    it.each([
      [
        "horizontal line (rotates 90° counter-clockwise)",
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { expectedDx: 0, expectedDy: 1 }, // 90° CCW rotation of (1,0) is (0,1)
      ],
      [
        "vertical line down (rotates 90° counter-clockwise)",
        { x: 0, y: 0 },
        { x: 0, y: 100 },
        { expectedDx: -1, expectedDy: 0 }, // 90° CCW rotation of (0,1) is (-1,0)
      ],
    ])("should calculate perpendicular for %s", (_, source, target, expected) => {
      const line = VectorLine.fromPositions(source, target)
      const result = calculatePerpendicularLine(line)

      // The perpendicular line starts from target
      expect(result.source.x).toBeCloseTo(target.x, 5)
      expect(result.source.y).toBeCloseTo(target.y, 5)

      // The direction should be perpendicular (normalized)
      const dx = result.target.x - result.source.x
      const dy = result.target.y - result.source.y
      expect(dx).toBeCloseTo(expected.expectedDx, 5)
      expect(dy).toBeCloseTo(expected.expectedDy, 5)
    })

    it("should create line with unit vector in perpendicular direction", () => {
      // Diagonal line 45°
      const line = VectorLine.fromPositions({ x: 0, y: 0 }, { x: 100, y: 100 })
      const result = calculatePerpendicularLine(line)

      // Perpendicular direction length should be 1 (normalized)
      const dx = result.target.x - result.source.x
      const dy = result.target.y - result.source.y
      const length = Math.sqrt(dx * dx + dy * dy)
      expect(length).toBeCloseTo(1, 5)

      // Check perpendicularity by dot product = 0
      const originalDx = 100 / Math.sqrt(2 * 100 * 100) // normalized
      const originalDy = 100 / Math.sqrt(2 * 100 * 100)
      const dotProduct = dx * originalDx + dy * originalDy
      expect(dotProduct).toBeCloseTo(0, 5)
    })
  })
})
