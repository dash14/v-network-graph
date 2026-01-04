import { describe, expect, it } from "vitest"
import { Box, ViewBox } from "../common/types"
import {
  areBoxesSame,
  boxAdd,
  boxDivide,
  boxMultiply,
  boxToViewBox,
  mergeBox,
  viewBoxToBox,
} from "./box"

describe("box", () => {
  describe("areBoxesSame", () => {
    it("should return true for the same box", () => {
      const box1: ViewBox = { x: 10, y: 20, width: 100, height: 200 }
      const box2: ViewBox = { x: 10, y: 20, width: 100, height: 200 }
      const actual = areBoxesSame(box1, box2)
      expect(actual).toBeTruthy()
    })

    it("should return false in case of different box", () => {
      const box1: ViewBox = { x: 10, y: 20, width: 100, height: 200 }
      const box2: ViewBox = { x: 11, y: 20, width: 100, height: 200 }
      const actual = areBoxesSame(box1, box2)
      expect(actual).toBeFalsy()
    })

    it.each([
      ["y", { x: 10, y: 21, width: 100, height: 200 }],
      ["width", { x: 10, y: 20, width: 101, height: 200 }],
      ["height", { x: 10, y: 20, width: 100, height: 201 }],
    ])("should return false when %s is different", (_, box2) => {
      const box1: ViewBox = { x: 10, y: 20, width: 100, height: 200 }
      expect(areBoxesSame(box1, box2)).toBeFalsy()
    })

    it("should return true when difference is within error tolerance", () => {
      // error = max(100, 200) / 10000 = 0.02
      const box1: ViewBox = { x: 10, y: 20, width: 100, height: 200 }
      const box2: ViewBox = { x: 10.01, y: 20.01, width: 100.01, height: 200.01 }
      expect(areBoxesSame(box1, box2)).toBeTruthy()
    })

    it("should return false when difference exceeds error tolerance", () => {
      // error = max(100, 200) / 10000 = 0.02
      const box1: ViewBox = { x: 10, y: 20, width: 100, height: 200 }
      const box2: ViewBox = { x: 10.03, y: 20, width: 100, height: 200 }
      expect(areBoxesSame(box1, box2)).toBeFalsy()
    })

    it("should return false for zero-size boxes (error = 0 means 0 < 0 is false)", () => {
      // error = max(0, 0, 0, 0) / 10000 = 0
      // With error = 0, comparison uses < (not <=), so even identical boxes return false
      const box1: ViewBox = { x: 10, y: 20, width: 0, height: 0 }
      const box2: ViewBox = { x: 10, y: 20, width: 0, height: 0 }
      expect(areBoxesSame(box1, box2)).toBeFalsy()
    })
  })

  describe("boxAdd", () => {
    it("should be all fields added", () => {
      const box1: Box = {
        top: 1,
        left: 2,
        right: 3,
        bottom: 4,
      }
      const box2: Box = {
        top: 5,
        left: 6,
        right: 7,
        bottom: 8,
      }
      const actual = boxAdd(box1, box2)
      expect(actual).toStrictEqual({
        top: 6,
        left: 8,
        right: 10,
        bottom: 12,
      })
    })

    it("should handle negative values", () => {
      const box1: Box = { top: -10, left: -20, right: 30, bottom: 40 }
      const box2: Box = { top: 5, left: 10, right: -15, bottom: -20 }
      const actual = boxAdd(box1, box2)
      expect(actual).toStrictEqual({ top: -5, left: -10, right: 15, bottom: 20 })
    })

    it("should handle zero box (identity)", () => {
      const box1: Box = { top: 10, left: 20, right: 30, bottom: 40 }
      const zeroBox: Box = { top: 0, left: 0, right: 0, bottom: 0 }
      const actual = boxAdd(box1, zeroBox)
      expect(actual).toStrictEqual(box1)
    })
  })

  describe("boxMultiply", () => {
    it("should be all fields multiplied", () => {
      const box: Box = {
        top: 1,
        left: 2,
        right: 3,
        bottom: 4,
      }
      const actual = boxMultiply(box, 4)
      expect(actual).toStrictEqual({
        top: 4,
        left: 8,
        right: 12,
        bottom: 16,
      })
    })

    it("should return zero box when multiplied by 0", () => {
      const box: Box = { top: 10, left: 20, right: 30, bottom: 40 }
      const actual = boxMultiply(box, 0)
      expect(actual).toStrictEqual({ top: 0, left: 0, right: 0, bottom: 0 })
    })

    it("should negate values when multiplied by -1", () => {
      const box: Box = { top: 10, left: 20, right: 30, bottom: 40 }
      const actual = boxMultiply(box, -1)
      expect(actual).toStrictEqual({ top: -10, left: -20, right: -30, bottom: -40 })
    })

    it("should handle fractional multiplier", () => {
      const box: Box = { top: 10, left: 20, right: 30, bottom: 40 }
      const actual = boxMultiply(box, 0.5)
      expect(actual).toStrictEqual({ top: 5, left: 10, right: 15, bottom: 20 })
    })
  })

  describe("boxDivide", () => {
    it("should be all fields divided", () => {
      const box: Box = {
        top: 4,
        left: 8,
        right: 12,
        bottom: 16,
      }
      const actual = boxDivide(box, 4)
      expect(actual).toStrictEqual({
        top: 1,
        left: 2,
        right: 3,
        bottom: 4,
      })
    })

    it("should return Infinity when divided by 0", () => {
      const box: Box = { top: 10, left: 20, right: 30, bottom: 40 }
      const actual = boxDivide(box, 0)
      expect(actual.top).toBe(Infinity)
      expect(actual.left).toBe(Infinity)
      expect(actual.right).toBe(Infinity)
      expect(actual.bottom).toBe(Infinity)
    })

    it("should negate values when divided by -1", () => {
      const box: Box = { top: 10, left: 20, right: 30, bottom: 40 }
      const actual = boxDivide(box, -1)
      expect(actual).toStrictEqual({ top: -10, left: -20, right: -30, bottom: -40 })
    })

    it("should return original box when divided by 1", () => {
      const box: Box = { top: 10, left: 20, right: 30, bottom: 40 }
      const actual = boxDivide(box, 1)
      expect(actual).toStrictEqual(box)
    })

    it("should handle fractional divisor", () => {
      const box: Box = { top: 10, left: 20, right: 30, bottom: 40 }
      const actual = boxDivide(box, 0.5)
      expect(actual).toStrictEqual({ top: 20, left: 40, right: 60, bottom: 80 })
    })
  })

  describe("viewBoxToBox", () => {
    it("should be converted from Box to ViewBox", () => {
      const viewBox: ViewBox = {
        x: 10,
        y: 20,
        width: 100,
        height: 200,
      }
      const actual = viewBoxToBox(viewBox)
      expect(actual).toStrictEqual({
        top: 20,
        left: 10,
        right: 110,
        bottom: 220,
      })
    })

    it("should handle zero size viewBox", () => {
      const viewBox: ViewBox = { x: 10, y: 20, width: 0, height: 0 }
      const actual = viewBoxToBox(viewBox)
      expect(actual).toStrictEqual({ top: 20, left: 10, right: 10, bottom: 20 })
    })

    it("should handle negative coordinates", () => {
      const viewBox: ViewBox = { x: -50, y: -30, width: 100, height: 80 }
      const actual = viewBoxToBox(viewBox)
      expect(actual).toStrictEqual({ top: -30, left: -50, right: 50, bottom: 50 })
    })
  })

  describe("boxToViewBox", () => {
    it("should be converted from ViewBox to Box", () => {
      const box: Box = {
        top: 20,
        left: 10,
        right: 110,
        bottom: 220,
      }
      const actual = boxToViewBox(box)
      expect(actual).toStrictEqual({
        x: 10,
        y: 20,
        width: 100,
        height: 200,
      })
    })

    it("should handle zero size box (left = right, top = bottom)", () => {
      const box: Box = { top: 20, left: 10, right: 10, bottom: 20 }
      const actual = boxToViewBox(box)
      expect(actual).toStrictEqual({ x: 10, y: 20, width: 0, height: 0 })
    })

    it("should handle negative coordinates", () => {
      const box: Box = { top: -30, left: -50, right: 50, bottom: 50 }
      const actual = boxToViewBox(box)
      expect(actual).toStrictEqual({ x: -50, y: -30, width: 100, height: 80 })
    })

    it("should return negative dimensions for inverted box", () => {
      const box: Box = { top: 100, left: 100, right: 50, bottom: 50 }
      const actual = boxToViewBox(box)
      expect(actual).toStrictEqual({ x: 100, y: 100, width: -50, height: -50 })
    })
  })

  describe("mergeBox", () => {
    it("should generate a box merged boxes", () => {
      const box1: Box = {
        top: 10,
        left: 20,
        right: 50,
        bottom: 60,
      }
      const box2: Box = {
        top: 20,
        left: 30,
        right: 60,
        bottom: 70,
      }
      const actual = mergeBox(box1, box2)
      expect(actual).toStrictEqual({
        top: 10,
        left: 20,
        right: 60,
        bottom: 70,
      })
    })

    it("should return same box when merging identical boxes", () => {
      const box: Box = { top: 10, left: 20, right: 50, bottom: 60 }
      const actual = mergeBox(box, { ...box })
      expect(actual).toStrictEqual(box)
    })

    it("should return outer box when one contains the other", () => {
      const outer: Box = { top: 0, left: 0, right: 100, bottom: 100 }
      const inner: Box = { top: 20, left: 20, right: 80, bottom: 80 }
      expect(mergeBox(outer, inner)).toStrictEqual(outer)
      expect(mergeBox(inner, outer)).toStrictEqual(outer)
    })

    it("should handle negative coordinates", () => {
      const box1: Box = { top: -50, left: -50, right: 0, bottom: 0 }
      const box2: Box = { top: 0, left: 0, right: 50, bottom: 50 }
      const actual = mergeBox(box1, box2)
      expect(actual).toStrictEqual({ top: -50, left: -50, right: 50, bottom: 50 })
    })

    it("should handle non-overlapping boxes", () => {
      const box1: Box = { top: 0, left: 0, right: 10, bottom: 10 }
      const box2: Box = { top: 100, left: 100, right: 110, bottom: 110 }
      const actual = mergeBox(box1, box2)
      expect(actual).toStrictEqual({ top: 0, left: 0, right: 110, bottom: 110 })
    })
  })
})
