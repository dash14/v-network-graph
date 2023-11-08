import { describe, expect, it } from "vitest"
import { Box, ViewBox } from "@/common/types"
import { boxDivide, boxMultiply, boxToViewBox, mergeBox, viewBoxToBox } from "@/utils/box"

describe("box", () => {
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
  })

  describe("viewBoxToBox", () => {
    it("should be converted from Box to ViewBox", () => {
      const viewBox: ViewBox = {
        x: 10,
        y: 20,
        width: 100,
        height: 200,
      }
      const actual = viewBoxToBox(viewBox);
      expect(actual).toStrictEqual({
        top: 20,
        left: 10,
        right: 110,
        bottom: 220,
      })
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
      const actual = boxToViewBox(box);
      expect(actual).toStrictEqual({
        x: 10,
        y: 20,
        width: 100,
        height: 200,
      })
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
  })
})
