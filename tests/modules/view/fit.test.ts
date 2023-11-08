import { describe, expect, it } from "vitest"
import { Box, Size, ViewBox } from "@/common/types"

// @ts-ignore
import { exportedForTesting, parseFitContentMargin } from "@/modules/view/fit"

const {
  calculateSizeWithoutMargin,
  calculatePanForCentering,
  calculateZoomLevelForFixedBox,
} = exportedForTesting

describe("fit", () => {
  describe("parseFitContentMargin", () => {
    it("should parse the number value", () => {
      const size: Size = { width: 200, height: 150 }
      const actual: Box = parseFitContentMargin(10, size)
      expect(actual).toStrictEqual({
        top: 10,
        left: 10,
        right: 10,
        bottom: 10,
      })
    })

    it("should parse the '${number}px' value", () => {
      const size: Size = { width: 200, height: 150 }
      const actual: Box = parseFitContentMargin("20px", size)
      expect(actual).toStrictEqual({
        top: 20,
        left: 20,
        right: 20,
        bottom: 20,
      })
    })

    it("should parse the '${number}%' value", () => {
      const size: Size = { width: 200, height: 150 }
      const actual: Box = parseFitContentMargin("10%", size)
      expect(actual).toStrictEqual({
        top: 15,
        left: 20,
        right: 20,
        bottom: 15,
      })
    })

    it("should parse the '${number}' value", () => {
      const size: Size = { width: 200, height: 150 }
      const actual: Box = parseFitContentMargin("10", size)
      expect(actual).toStrictEqual({
        top: 10,
        left: 10,
        right: 10,
        bottom: 10,
      })
    })

    it("should parse the object value", () => {
      const size: Size = { width: 200, height: 150 }
      const actual: Box = parseFitContentMargin(
        {
          top: 10,
          left: "20px",
          right: "20%",
          bottom: "30",
        },
        size
      )
      expect(actual).toStrictEqual({
        top: 10,
        left: 20,
        right: 40,
        bottom: 30,
      })
    })
  })

  describe("private: calculateSizeWithoutMargin", () => {
    it("should calculate the size excluding the margins", () => {
      const size: Size = {
        width: 500,
        height: 400,
      }
      const margins: Box = {
        top: 10,
        left: 20,
        right: 30,
        bottom: 50,
      }
      const actual = calculateSizeWithoutMargin(size, margins)
      expect(actual).toStrictEqual({
        width: 450,
        height: 340,
      })
    })
  })

  describe("private: calculatePanForCentering", () => {
    it("should calculate the pan amount for centering", () => {
      const box: Box = {
        top: 10,
        left: 20,
        right: 220,
        bottom: 110,
      }
      const zoom = 2
      const size: Size = { width: 600, height: 400 }
      const margins: Box = { top: 0, left: 0, right: 0, bottom: 0 }
      const pan = calculatePanForCentering(box, zoom, size, margins)
      expect(pan).toStrictEqual({
        x: (600 - 200 * 2) / 2 - 20 * 2, // 60
        y: (400 - 100 * 2) / 2 - 10 * 2, // 80
      })
    })

    it("should calculate the pan amount for centering with margin", () => {
      const box: Box = {
        top: 10,
        left: 20,
        right: 220,
        bottom: 110,
      }
      const zoom = 2
      const size: Size = { width: 600, height: 400 }
      const margins: Box = {
        top: 20,
        left: 20,
        right: 0,
        bottom: 0,
      }
      const pan = calculatePanForCentering(box, zoom, size, margins)
      expect(pan).toStrictEqual({
        x: (600 - 20 - 200 * 2) / 2 - 20 * 2 + 20, // 70
        y: (400 - 20 - 100 * 2) / 2 - 10 * 2 + 20, // 90
      })
    })
  })

  describe("private: calculateZoomLevelForFixedBox", () => {
    it("should calculate the zoom level: reduction, width", () => {
      const viewBox: ViewBox = { x: 10, y: 10, width: 200, height: 100 }
      const size: Size = { width: 100, height: 200 }
      const margins: Box = { top: 0, left: 0, right: 0, bottom: 0 }
      const zoom = calculateZoomLevelForFixedBox(viewBox, size, margins)
      expect(zoom).toBe(0.5)
    })

    it("should calculate the zoom level: reduction, height", () => {
      const viewBox: ViewBox = { x: 10, y: 10, width: 100, height: 200 }
      const size: Size = { width: 200, height: 100 }
      const margins: Box = { top: 0, left: 0, right: 0, bottom: 0 }
      const zoom = calculateZoomLevelForFixedBox(viewBox, size, margins)
      expect(zoom).toBe(0.5)
    })

    it("should calculate the zoom level: magnification, width", () => {
      const viewBox: ViewBox = { x: 10, y: 10, width: 200, height: 100 }
      const size: Size = { width: 400, height: 400 }
      const margins: Box = { top: 0, left: 0, right: 0, bottom: 0 }
      const zoom = calculateZoomLevelForFixedBox(viewBox, size, margins)
      expect(zoom).toBe(2)
    })

    it("should calculate the zoom level: magnification, height", () => {
      const viewBox: ViewBox = { x: 10, y: 10, width: 100, height: 200 }
      const size: Size = { width: 400, height: 400 }
      const margins: Box = { top: 0, left: 0, right: 0, bottom: 0 }
      const zoom = calculateZoomLevelForFixedBox(viewBox, size, margins)
      expect(zoom).toBe(2)
    })

    it("should calculate the zoom level: reduction, margin", () => {
      const viewBox: ViewBox = { x: 10, y: 10, width: 200, height: 100 }
      const size: Size = { width: 100, height: 200 }
      const margins: Box = { top: 0, left: 25, right: 25, bottom: 0 }
      const zoom = calculateZoomLevelForFixedBox(viewBox, size, margins)
      expect(zoom).toBe(0.25)
    })

    it("should calculate the zoom level: magnification, margin", () => {
      const viewBox: ViewBox = { x: 10, y: 10, width: 200, height: 100 }
      const size: Size = { width: 400, height: 400 }
      const margins: Box = { top: 0, left: 25, right: 25, bottom: 0 }
      const zoom = calculateZoomLevelForFixedBox(viewBox, size, margins)
      expect(zoom).toBe(1.75)
    })

    it("should return 0 if the size of the viewBox is 0", () => {
      const viewBox: ViewBox = { x: 0, y: 0, width: 0, height: 100 }
      const size: Size = { width: 100, height: 100 }
      const margins: Box = { top: 0, left: 0, right: 0, bottom: 0 }
      let zoom = calculateZoomLevelForFixedBox(viewBox, size, margins)
      expect(zoom).toBe(0)

      viewBox.width = 100
      viewBox.height = 0
      zoom = calculateZoomLevelForFixedBox(viewBox, size, margins)
      expect(zoom).toBe(0)
    })

    it("should return 0 if the margin is too large to display", () => {
      const viewBox: ViewBox = { x: 0, y: 0, width: 100, height: 100 }
      const size: Size = { width: 200, height: 200 }
      const margins: Box = { top: 150, left: 0, right: 0, bottom: 150 }
      const zoom = calculateZoomLevelForFixedBox(viewBox, size, margins)
      expect(zoom).toBe(0)
    })
  })
})
