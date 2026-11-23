import { describe, expect, it } from "vitest"
import { AnyShapeStyle } from "@/common/configs"
import { Position } from "@/common/types"
import { Vector2D } from "@/modules/vector2d"
import {
  crossingsOfCircle,
  distanceOutside,
  NodeOutline,
  outlineOf,
  outwardNormal,
  reachOf,
} from "./outline"

const origin = { x: 0, y: 0 }

const rect = (width: number, height: number, borderRadius: number) =>
  ({ type: "rect", width, height, borderRadius, strokeWidth: 4 }) as AnyShapeStyle

// Sorted so that crossings found in any order compare equal.
const sorted = (points: Position[]) =>
  points
    .map(p => [p.x, p.y])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1])
    .filter((p, i, all) => i === 0 || Math.hypot(p[0] - all[i - 1][0], p[1] - all[i - 1][1]) > 1e-9)

describe("outlineOf", () => {
  it("should make a circle a rectangle whose corners meet, without the stroke", () => {
    const shape = { type: "circle", radius: 10, strokeWidth: 4 } as AnyShapeStyle
    expect(outlineOf(shape, { x: 1, y: 2 }, 2)).toEqual({
      center: new Vector2D(1, 2),
      halfWidth: 20,
      halfHeight: 20,
      cornerRadius: 20,
    })
  })

  it("should scale a rectangle without its stroke", () => {
    expect(outlineOf(rect(60, 20, 3), origin, 2)).toEqual({
      center: new Vector2D(0, 0),
      halfWidth: 60,
      halfHeight: 20,
      cornerRadius: 6,
    })
  })

  it.each([
    [30, 10],
    [-1, 0],
  ])("should keep a corner radius of %s within the rectangle", (borderRadius, expected) => {
    expect(outlineOf(rect(60, 20, borderRadius), origin, 1).cornerRadius).toBe(expected)
  })
})

describe("distanceOutside", () => {
  const outline = outlineOf(rect(60, 20, 5), origin, 1)

  it.each([
    [{ x: 40, y: 0 }, 10],
    [{ x: 0, y: -12 }, 2],
    [{ x: 0, y: 0 }, -10],
    [{ x: 25, y: 9 }, -1],
    // past the corner, from the center of its circle at 25, 5
    [{ x: 28, y: 9 }, 0],
    [{ x: 31, y: 13 }, 5],
  ])("should measure %o as %s outside", (p, expected) => {
    expect(distanceOutside(outline, p)).toBeCloseTo(expected)
  })
})

describe("outwardNormal", () => {
  const outline = outlineOf(rect(60, 20, 5), { x: 100, y: 100 }, 1)

  it.each([
    [
      { x: 70, y: 100 },
      { x: -1, y: 0 },
    ],
    [
      { x: 100, y: 110 },
      { x: 0, y: 1 },
    ],
    [
      { x: 128, y: 91 },
      { x: 0.6, y: -0.8 },
    ],
  ])("should point out of the outline at %o", (p, expected) => {
    const n = outwardNormal(outline, p)
    expect(n.x).toBeCloseTo(expected.x)
    expect(n.y).toBeCloseTo(expected.y)
  })

  it("should point out of a circle along its radius", () => {
    const circle = outlineOf({ type: "circle", radius: 10 } as AnyShapeStyle, origin, 1)
    expect(outwardNormal(circle, { x: 10, y: 0 })).toEqual(new Vector2D(1, 0))
    const n = outwardNormal(circle, { x: -6, y: 8 })
    expect(n.x).toBeCloseTo(-0.6)
    expect(n.y).toBeCloseTo(0.8)
  })
})

describe("reachOf", () => {
  const outline = outlineOf(rect(60, 20, 5), origin, 1)

  it("should reach the sides straight across", () => {
    expect(reachOf(outline, { x: -1, y: 0 })).toBeCloseTo(30)
    expect(reachOf(outline, { x: 0, y: 1 })).toBeCloseTo(10)
  })

  it("should reach the corner diagonally", () => {
    const n = { x: Math.SQRT1_2, y: -Math.SQRT1_2 }
    // the center of the corner circle at 25, -5, plus its radius
    expect(reachOf(outline, n)).toBeCloseTo((25 + 5) * Math.SQRT1_2 + 5)
  })
})

describe("crossingsOfCircle", () => {
  const cross = (outline: NodeOutline, x: number, y: number, radius: number) =>
    sorted(crossingsOfCircle(outline, new Vector2D(x, y), radius))

  it("should cross a side of a rectangle", () => {
    const outline = outlineOf(rect(60, 20, 0), origin, 1)
    expect(cross(outline, -35, 0, 6)).toEqual([
      [-30, -Math.sqrt(11)],
      [-30, Math.sqrt(11)],
    ])
  })

  it("should cross two sides around a corner of a rectangle", () => {
    const outline = outlineOf(rect(60, 20, 0), origin, 1)
    expect(cross(outline, 30, 10, 2)).toEqual([
      [28, 10],
      [30, 8],
    ])
  })

  it("should cross a side and leave out the circles of the corners off the corners", () => {
    const outline = outlineOf(rect(60, 20, 5), origin, 1)
    expect(cross(outline, -32, 0, 4)).toEqual([
      [-30, -Math.sqrt(12)],
      [-30, Math.sqrt(12)],
    ])
  })

  it("should cross a rounded corner", () => {
    const outline = outlineOf(rect(60, 20, 5), origin, 1)
    const crossings = cross(outline, 30, 10, 4)
    expect(crossings).toHaveLength(2)
    for (const [x, y] of crossings) {
      expect(Math.hypot(x - 25, y - 5)).toBeCloseTo(5)
      expect(x).toBeGreaterThan(25)
      expect(y).toBeGreaterThan(5)
    }
  })

  it("should cross a circle", () => {
    const outline = outlineOf({ type: "circle", radius: 10 } as AnyShapeStyle, origin, 1)
    expect(cross(outline, 0, 20, Math.sqrt(260)).map(p => p.map(v => +v.toFixed(9)))).toEqual([
      [-8, 6],
      [8, 6],
    ])
  })

  it("should find nothing for a circle clear of the outline", () => {
    const outline = outlineOf(rect(60, 20, 5), origin, 1)
    expect(cross(outline, 100, 0, 10)).toEqual([])
  })
})
