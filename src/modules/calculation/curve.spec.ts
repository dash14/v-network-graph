import { describe, expect, it } from "vitest"
import { calculateSubpath, parsePathD } from "./curve"

// ============================================================
// Test helper functions
// ============================================================

/** Extract start point (M command) from path string */
function extractStartPoint(path: string): { x: number; y: number } {
  // Try comma-separated format: "M108.30,70.10..."
  const match = path.match(/^M(-?[\d.]+),(-?[\d.]+)/)
  if (match) {
    return { x: parseFloat(match[1]), y: parseFloat(match[2]) }
  }
  // Try space-separated format: "M 80 80 ..."
  const spaceMatch = path.match(/^M\s*(-?[\d.]+)\s+(-?[\d.]+)/)
  if (spaceMatch) {
    return { x: parseFloat(spaceMatch[1]), y: parseFloat(spaceMatch[2]) }
  }
  throw new Error("Invalid path: " + path)
}

/** Extract end point (last two numbers) from path string */
function extractEndPoint(path: string): { x: number; y: number } {
  const numbers = path.match(/-?[\d.]+/g)
  if (!numbers || numbers.length < 2) throw new Error("Invalid path")
  return {
    x: parseFloat(numbers[numbers.length - 2]),
    y: parseFloat(numbers[numbers.length - 1]),
  }
}

/** Calculate distance between two points */
function distance(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2)
}

/** Calculate chord length from arc length and radius */
function chordLength(arcMargin: number, r: number): number {
  const angle = arcMargin / r
  return 2 * r * Math.sin(angle / 2)
}

// ============================================================
// Tests
// ============================================================

describe("parsePathD", () => {
  it("should parse simple M command", () => {
    const result = parsePathD("M 10 20")
    expect(result.d).toBe("M 10 20")
    expect(result.segments).toHaveLength(1)
    expect(result.segments[0][0]).toBe("M")
  })

  it("should parse M and L commands", () => {
    const result = parsePathD("M 0 0 L 100 100")
    expect(result.segments).toHaveLength(2)
    expect(result.segments[0][0]).toBe("M")
    expect(result.segments[1][0]).toBe("C") // L is converted to C
  })

  it("should parse Q (quadratic) command", () => {
    const result = parsePathD("M 0 0 Q 50 50 100 0")
    expect(result.segments).toHaveLength(2)
    expect(result.segments[0][0]).toBe("M")
    expect(result.segments[1][0]).toBe("C") // Q is converted to C
  })

  it("should parse C (cubic) command", () => {
    const result = parsePathD("M 0 0 C 25 50 75 50 100 0")
    expect(result.segments).toHaveLength(2)
    expect(result.segments[0][0]).toBe("M")
    expect(result.segments[1][0]).toBe("C")
  })

  it("should parse H and V commands", () => {
    const result = parsePathD("M 0 0 H 100 V 100")
    expect(result.segments).toHaveLength(3)
    // H and V are converted to C
    expect(result.segments[1][0]).toBe("C")
    expect(result.segments[2][0]).toBe("C")
  })

  it("should parse A (arc) command", () => {
    const result = parsePathD("M 10 10 A 5 5 0 0 1 20 20")
    // A is converted to one or more C commands depending on arc size
    expect(result.segments.length).toBeGreaterThanOrEqual(2)
    expect(result.segments[0][0]).toBe("M")
    expect(result.segments[1][0]).toBe("C") // A is converted to C
  })

  it("should parse Z (close path) command", () => {
    const result = parsePathD("M 0 0 L 100 0 L 100 100 Z")
    expect(result.segments.length).toBeGreaterThanOrEqual(4)
  })

  // Boundary: empty or invalid path
  it("should handle empty path by returning default", () => {
    const result = parsePathD("")
    expect(result.segments).toHaveLength(1)
    expect(result.segments[0]).toEqual(["M", 0, 0])
  })
})

describe("calculateSubpath", () => {
  describe("subpath of bezier curve", () => {
    // Two quadratic bezier curves joined at (160, 63)
    // Start: (80, 80), End: (240, 80)
    // Symmetric around x=160
    const pathD = "M 80 80 Q 120 63 160 63 Q 200 63 240 80"
    const segments = parsePathD(pathD)
    const originalStart = { x: 80, y: 80 }
    const originalEnd = { x: 240, y: 80 }

    it("should return original path when margins are 0", () => {
      const subpath = calculateSubpath(segments, 0, 0)
      expect(subpath).toBe(pathD)
    })

    it("should calculate correct start point with from margin", () => {
      const subpath = calculateSubpath(segments, 30, 0)
      const start = extractStartPoint(subpath)
      const end = extractEndPoint(subpath)

      // Verify start moved inward (expected: 108.30, 70.10)
      expect(start.x).toBeCloseTo(108.30, 1)
      expect(start.y).toBeCloseTo(70.10, 1)

      // Verify end unchanged
      expect(end.x).toBeCloseTo(originalEnd.x, 1)
      expect(end.y).toBeCloseTo(originalEnd.y, 1)
    })

    it("should calculate correct end point with to margin", () => {
      const subpath = calculateSubpath(segments, 0, 30)
      const start = extractStartPoint(subpath)
      const end = extractEndPoint(subpath)

      // Verify start unchanged
      expect(start.x).toBeCloseTo(originalStart.x, 1)
      expect(start.y).toBeCloseTo(originalStart.y, 1)

      // Verify end moved inward (expected: 211.70, 70.10)
      expect(end.x).toBeCloseTo(211.70, 1)
      expect(end.y).toBeCloseTo(70.10, 1)
    })

    it("should calculate correct points with both margins (symmetry)", () => {
      const subpath = calculateSubpath(segments, 30, 30)
      const start = extractStartPoint(subpath)
      const end = extractEndPoint(subpath)

      // Verify both endpoints
      expect(start.x).toBeCloseTo(108.30, 1)
      expect(start.y).toBeCloseTo(70.10, 1)
      expect(end.x).toBeCloseTo(211.70, 1)
      expect(end.y).toBeCloseTo(70.10, 1)

      // Verify symmetry around x=160
      expect(start.x + end.x).toBeCloseTo(320, 0) // 160 * 2
      expect(start.y).toBeCloseTo(end.y, 1)
    })
  })

  // Boundary value tests
  describe("boundary: from and to values", () => {
    const pathD = "M 0 0 L 100 0"
    const segments = parsePathD(pathD)

    it.each([
      // [description, from, to]
      ["from=0, to=0 (returns original path)", 0, 0],
      ["from<0 (negative from is clamped to 0)", -10, 0],
      ["to<0 (negative to is clamped to 0)", 0, -10],
      ["both negative (both clamped to 0)", -5, -5],
    ])("should handle %s", (_, from, to) => {
      const subpath = calculateSubpath(segments, from, to)
      // When from=0 and to=0 (or clamped to 0), returns original path
      expect(subpath).toBe(pathD)
    })

    it("should handle from > 0 with to = 0", () => {
      const subpath = calculateSubpath(segments, 10, 0)
      expect(subpath).toBeDefined()
      expect(subpath).not.toBe(pathD) // Should be different from original
      expect(subpath.startsWith("M")).toBe(true)
    })

    it("should handle from = 0 with to > 0", () => {
      const subpath = calculateSubpath(segments, 0, 10)
      expect(subpath).toBeDefined()
      expect(subpath).not.toBe(pathD)
      expect(subpath.startsWith("M")).toBe(true)
    })
  })

  describe("boundary: to approaches total length", () => {
    const pathD = "M 0 0 L 100 0" // Length is 100
    const segments = parsePathD(pathD)

    it("should handle to equal to total length (returns end segment)", () => {
      // to = 100 means we want to cut 100 from end, leaving ~0 length
      const subpath = calculateSubpath(segments, 0, 100)
      expect(subpath).toBeDefined()
    })

    it("should handle to very close to total length", () => {
      // total - to < 1e-6 boundary
      const subpath = calculateSubpath(segments, 0, 99.9999999)
      expect(subpath).toBeDefined()
    })
  })

  describe("subpath of line", () => {
    const pathD = "M 0 0 L 100 0"
    const segments = parsePathD(pathD)

    it("should calculate subpath for simple line", () => {
      const subpath = calculateSubpath(segments, 10, 10)
      expect(subpath).toBeDefined()
      expect(subpath.startsWith("M")).toBe(true)
    })
  })

  describe("subpath of arc", () => {
    // Arc command: M 70 80 A 29 29 0 1 1 70 79
    // This creates an almost complete circle (large arc flag = 1)
    // Start point: (70, 80), End point: (70, 79)
    // Center: (41, 79.5), Radius: 29
    const pathD = "M 70 80 A 29 29 0 1 1 70 79"
    const segments = parsePathD(pathD)
    const center = { x: 41, y: 79.5 }
    const radius = 29
    const originalStart = { x: 70, y: 80 }
    const originalEnd = { x: 70, y: 79 }

    it("should return valid path when from=0, to=0", () => {
      const subpath = calculateSubpath(segments, 0, 0)
      expect(subpath).toBe(pathD)
    })

    it("should calculate correct start point with from margin", () => {
      const margin = 30
      const subpath = calculateSubpath(segments, margin, 0)
      const start = extractStartPoint(subpath)

      // Verify chord distance from original start point
      // Arc length 30 with radius 29 gives chord ≈ 28.71
      const expectedChord = chordLength(margin, radius)
      const actualDist = distance(start, originalStart)
      expect(actualDist).toBeCloseTo(expectedChord, 0)

      // Verify point is still on the circle (distance from center = radius)
      const distFromCenter = distance(start, center)
      expect(distFromCenter).toBeCloseTo(radius, 0)
    })

    it("should calculate correct end point with to margin", () => {
      const margin = 30
      const subpath = calculateSubpath(segments, 0, margin)
      const end = extractEndPoint(subpath)

      // Verify chord distance from original end point
      const expectedChord = chordLength(margin, radius)
      const actualDist = distance(end, originalEnd)
      expect(actualDist).toBeCloseTo(expectedChord, 0)

      // Verify point is still on the circle
      const distFromCenter = distance(end, center)
      expect(distFromCenter).toBeCloseTo(radius, 0)
    })

    it("should calculate correct points with both margins", () => {
      const margin = 30
      const subpath = calculateSubpath(segments, margin, margin)
      const start = extractStartPoint(subpath)
      const end = extractEndPoint(subpath)

      // Verify chord distances from original endpoints
      const expectedChord = chordLength(margin, radius)
      expect(distance(start, originalStart)).toBeCloseTo(expectedChord, 0)
      expect(distance(end, originalEnd)).toBeCloseTo(expectedChord, 0)

      // Verify both points are still on the circle
      expect(distance(start, center)).toBeCloseTo(radius, 1)
      expect(distance(end, center)).toBeCloseTo(radius, 0)
    })

    it.each([
      ["small margin", 10],
      ["medium margin", 30],
      ["large margin", 50],
    ])("should produce valid subpath with %s", (_, margin) => {
      const subpath = calculateSubpath(segments, margin, margin)
      const start = extractStartPoint(subpath)
      const end = extractEndPoint(subpath)

      // Verify chord distances match expected values
      const expectedChord = chordLength(margin, radius)
      expect(distance(start, originalStart)).toBeCloseTo(expectedChord, 0)
      expect(distance(end, originalEnd)).toBeCloseTo(expectedChord, 0)

      // Verify both points are on the circle
      expect(distance(start, center)).toBeCloseTo(radius, 1)
      expect(distance(end, center)).toBeCloseTo(radius, 0)
    })

    // Boundary: small arc (not large arc)
    it("should handle small arc (large_arc_flag=0)", () => {
      // Small arc from (0,0) to (100,0) with radius 50
      // This is a semicircle going downward (in SVG coords, positive y)
      // Center: (50, 0), Radius: 50
      const smallArcPath = "M 0 0 A 50 50 0 0 1 100 0"
      const smallArcSegments = parsePathD(smallArcPath)
      const smallArcCenter = { x: 50, y: 0 }
      const smallArcRadius = 50
      const smallArcMargin = 10

      const subpath = calculateSubpath(smallArcSegments, smallArcMargin, smallArcMargin)
      const start = extractStartPoint(subpath)
      const end = extractEndPoint(subpath)

      // Verify chord distances from original endpoints
      const expectedChord = chordLength(smallArcMargin, smallArcRadius) // ≈ 9.98
      expect(distance(start, { x: 0, y: 0 })).toBeCloseTo(expectedChord, 0)
      expect(distance(end, { x: 100, y: 0 })).toBeCloseTo(expectedChord, 0)

      // Verify points are on the circle
      expect(distance(start, smallArcCenter)).toBeCloseTo(smallArcRadius, 0)
      expect(distance(end, smallArcCenter)).toBeCloseTo(smallArcRadius, 0)

      // Direction check: start moved right, end moved left
      expect(start.x).toBeGreaterThan(0)
      expect(end.x).toBeLessThan(100)
    })

    // Boundary: sweep direction
    it("should handle arc with opposite sweep direction (sweep_flag=0)", () => {
      // Same arc but going downward (opposite sweep)
      // Center: (50, 0), Radius: 50
      const reverseSweepPath = "M 0 0 A 50 50 0 0 0 100 0"
      const reverseSweepSegments = parsePathD(reverseSweepPath)
      const reverseSweepCenter = { x: 50, y: 0 }
      const reverseSweepRadius = 50
      const reverseSweepMargin = 10

      const subpath = calculateSubpath(reverseSweepSegments, reverseSweepMargin, reverseSweepMargin)
      const start = extractStartPoint(subpath)
      const end = extractEndPoint(subpath)

      // Verify chord distances from original endpoints
      const expectedChord = chordLength(reverseSweepMargin, reverseSweepRadius)
      expect(distance(start, { x: 0, y: 0 })).toBeCloseTo(expectedChord, 0)
      expect(distance(end, { x: 100, y: 0 })).toBeCloseTo(expectedChord, 0)

      // Verify points are on the circle
      expect(distance(start, reverseSweepCenter)).toBeCloseTo(reverseSweepRadius, 0)
      expect(distance(end, reverseSweepCenter)).toBeCloseTo(reverseSweepRadius, 0)

      // Direction check: start moved right, end moved left
      expect(start.x).toBeGreaterThan(0)
      expect(end.x).toBeLessThan(100)
    })
  })

  describe("subpath of various curve types", () => {
    it.each([
      ["quadratic bezier (Q)", "M 0 0 Q 50 100 100 0"],
      ["cubic bezier (C)", "M 0 0 C 25 100 75 100 100 0"],
      ["smooth cubic (S)", "M 0 0 C 25 50 75 50 100 0 S 175 -50 200 0"],
      ["smooth quadratic (T)", "M 0 0 Q 50 50 100 0 T 200 0"],
      ["horizontal line (H)", "M 0 0 H 100"],
      ["vertical line (V)", "M 0 0 V 100"],
      ["line (L)", "M 0 0 L 100 100"],
    ])("should calculate subpath for %s", (_, pathD) => {
      const segments = parsePathD(pathD)
      const subpath = calculateSubpath(segments, 10, 10)
      expect(subpath).toBeDefined()
      expect(subpath.startsWith("M")).toBe(true)
    })
  })
})
