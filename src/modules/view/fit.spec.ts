import { describe, expect, it, vi } from "vitest"
import { cloneDeep } from "lodash-es"
import { Box, NodePositions, Size, ViewBox } from "../../common/types"

// @ts-ignore
import { exportedForTesting, parseFitContentMargin } from "./fit"

const {
  calculateFitWithScalingObjects,
  calculateFitWithoutScalingObjects,
  calculateZoomLevelForFixedBox,
  calculatePanForCentering,
  calculateSizeWithoutMargin,
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

    it("should return default value and warn for invalid string", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
      const size: Size = { width: 200, height: 150 }
      const actual: Box = parseFitContentMargin("invalid", size)
      expect(actual).toStrictEqual({ top: 0, left: 0, right: 0, bottom: 0 })
      expect(warnSpy).toHaveBeenCalledWith("Invalid `fitContentMargin` value.", "invalid")
      warnSpy.mockRestore()
    })

    it("should return default value and warn for empty string", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
      const size: Size = { width: 200, height: 150 }
      const actual: Box = parseFitContentMargin("", size)
      expect(actual).toStrictEqual({ top: 0, left: 0, right: 0, bottom: 0 })
      expect(warnSpy).toHaveBeenCalledWith("Invalid `fitContentMargin` value.", "")
      warnSpy.mockRestore()
    })

    it.each([
      ["number 0", 0, { top: 0, left: 0, right: 0, bottom: 0 }],
      ["string '0px'", "0px", { top: 0, left: 0, right: 0, bottom: 0 }],
      ["string '0%'", "0%", { top: 0, left: 0, right: 0, bottom: 0 }],
      ["string '0'", "0", { top: 0, left: 0, right: 0, bottom: 0 }],
    ])("should handle zero value: %s", (_, input, expected) => {
      const size: Size = { width: 200, height: 150 }
      const actual: Box = parseFitContentMargin(input as number | string, size)
      expect(actual).toStrictEqual(expected)
    })

    it("should handle partial object with only top", () => {
      const size: Size = { width: 200, height: 150 }
      const actual: Box = parseFitContentMargin({ top: 10 }, size)
      expect(actual).toStrictEqual({ top: 10, left: 0, right: 0, bottom: 0 })
    })

    it("should handle partial object with only left and right", () => {
      const size: Size = { width: 200, height: 150 }
      const actual: Box = parseFitContentMargin({ left: 20, right: 30 }, size)
      expect(actual).toStrictEqual({ top: 0, left: 20, right: 30, bottom: 0 })
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

    it("should return negative values when margins exceed container", () => {
      const size: Size = { width: 100, height: 100 }
      const margins: Box = { top: 100, left: 100, right: 100, bottom: 100 }
      const actual = calculateSizeWithoutMargin(size, margins)
      expect(actual).toStrictEqual({ width: -100, height: -100 })
    })

    it("should return zero size when margins equal container", () => {
      const size: Size = { width: 100, height: 100 }
      const margins: Box = { top: 25, left: 50, right: 50, bottom: 75 }
      const actual = calculateSizeWithoutMargin(size, margins)
      expect(actual).toStrictEqual({ width: 0, height: 0 })
    })

    it("should handle zero size container", () => {
      const size: Size = { width: 0, height: 0 }
      const margins: Box = { top: 0, left: 0, right: 0, bottom: 0 }
      const actual = calculateSizeWithoutMargin(size, margins)
      expect(actual).toStrictEqual({ width: 0, height: 0 })
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

    it("should handle zero zoom", () => {
      const box: Box = { top: 10, left: 20, right: 220, bottom: 110 }
      const zoom = 0
      const size: Size = { width: 600, height: 400 }
      const margins: Box = { top: 0, left: 0, right: 0, bottom: 0 }
      const pan = calculatePanForCentering(box, zoom, size, margins)
      expect(pan).toStrictEqual({ x: 300, y: 200 })
    })

    it("should handle zero size box", () => {
      const box: Box = { top: 0, left: 0, right: 0, bottom: 0 }
      const zoom = 1
      const size: Size = { width: 600, height: 400 }
      const margins: Box = { top: 0, left: 0, right: 0, bottom: 0 }
      const pan = calculatePanForCentering(box, zoom, size, margins)
      expect(pan).toStrictEqual({ x: 300, y: 200 })
    })

    it("should handle zoom level 1", () => {
      const box: Box = { top: 0, left: 0, right: 100, bottom: 100 }
      const zoom = 1
      const size: Size = { width: 200, height: 200 }
      const margins: Box = { top: 0, left: 0, right: 0, bottom: 0 }
      const pan = calculatePanForCentering(box, zoom, size, margins)
      expect(pan).toStrictEqual({ x: 50, y: 50 })
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

    it("should return 0 if both width and height of the viewBox are 0", () => {
      const viewBox: ViewBox = { x: 0, y: 0, width: 0, height: 0 }
      const size: Size = { width: 100, height: 100 }
      const margins: Box = { top: 0, left: 0, right: 0, bottom: 0 }
      const zoom = calculateZoomLevelForFixedBox(viewBox, size, margins)
      expect(zoom).toBe(0)
    })

    it("should return 0 if margins equal container size", () => {
      const viewBox: ViewBox = { x: 0, y: 0, width: 100, height: 100 }
      const size: Size = { width: 100, height: 100 }
      const margins: Box = { top: 25, left: 50, right: 50, bottom: 75 }
      const zoom = calculateZoomLevelForFixedBox(viewBox, size, margins)
      expect(zoom).toBe(0)
    })
  })

  interface CalculateFitWithoutScalingObjectsParams {
    viewport: ViewBox
    graphBox: ViewBox
    container: Size
    nodesLayouts: NodePositions
    zoomLevel: number
    margins: Box
  }
  const defaultParams1: CalculateFitWithoutScalingObjectsParams = {
    viewport: { x: 100, y: 200, width: 600, height: 400 },
    graphBox: { x: 150, y: 250, width: 500, height: 300 },
    container: { width: 1200, height: 800 },
    nodesLayouts: {
      node1: { x: 200, y: 300 },
      node2: { x: 600, y: 500 },
    },
    zoomLevel: 1,
    margins: { top: 0, left: 0, right: 0, bottom: 0 },
  }

  describe("calculateFitWithoutScalingObjects", () => {
    it("should be able to be calculated correctly with smaller graph, only graph", () => {
      const params = cloneDeep(defaultParams1)
      params.graphBox = params.viewport
      const zoomAt = calculateFitWithoutScalingObjects(
        params.viewport,
        params.graphBox,
        params.container,
        params.nodesLayouts,
        params.zoomLevel,
        params.margins
      )
      expect(zoomAt.pos.x).toBeCloseTo(-400, 1)
      expect(zoomAt.pos.y).toBeCloseTo(-600, 1)
      expect(zoomAt.zoom).toBeCloseTo(2.5, 3)
    })

    it("should be able to be calculated correctly with smaller graph, background", () => {
      const params = cloneDeep(defaultParams1)
      const zoomAt = calculateFitWithoutScalingObjects(
        params.viewport,
        params.graphBox,
        params.container,
        params.nodesLayouts,
        params.zoomLevel,
        params.margins
      )
      expect(zoomAt.pos.x).toBeCloseTo(-200, 1)
      expect(zoomAt.pos.y).toBeCloseTo(-400, 1)
      expect(zoomAt.zoom).toBeCloseTo(2, 3)
    })

    it("should be able to be calculated correctly with larger graph, only graph", () => {
      const params = cloneDeep(defaultParams1)
      params.graphBox = params.viewport
      params.container = { width: 600, height: 400 }
      const zoomAt = calculateFitWithoutScalingObjects(
        params.viewport,
        params.graphBox,
        params.container,
        params.nodesLayouts,
        params.zoomLevel,
        params.margins
      )
      expect(zoomAt.pos.x).toBeCloseTo(-100, 1)
      expect(zoomAt.pos.y).toBeCloseTo(-200, 1)
      expect(zoomAt.zoom).toBeCloseTo(1, 3)
    })

    it("should be able to be calculated correctly with larger graph, background", () => {
      const params = cloneDeep(defaultParams1)
      params.container = { width: 600, height: 400 }
      const zoomAt = calculateFitWithoutScalingObjects(
        params.viewport,
        params.graphBox,
        params.container,
        params.nodesLayouts,
        params.zoomLevel,
        params.margins
      )
      expect(zoomAt.pos.x).toBeCloseTo(-100, 1)
      expect(zoomAt.pos.y).toBeCloseTo(-200, 1)
      expect(zoomAt.zoom).toBeCloseTo(1, 3)
    })

    it("should be able to be calculated correctly with smaller graph, only graph, margin", () => {
      const params = cloneDeep(defaultParams1)
      params.graphBox = params.viewport
      params.container = { width: 1300, height: 900 }
      params.margins = { top: 50, left: 50, right: 50, bottom: 50 }
      const zoomAt = calculateFitWithoutScalingObjects(
        params.viewport,
        params.graphBox,
        params.container,
        params.nodesLayouts,
        params.zoomLevel,
        params.margins
      )
      expect(zoomAt.pos.x).toBeCloseTo(-350, 1)
      expect(zoomAt.pos.y).toBeCloseTo(-550, 1)
      expect(zoomAt.zoom).toBeCloseTo(2.5, 3)
    })

    it("should return undefined if there is less than one node", () => {
      const params = cloneDeep(defaultParams1)
      params.nodesLayouts = { node1: { x: 200, y: 300 } }
      const zoomAt = calculateFitWithoutScalingObjects(
        params.viewport,
        params.graphBox,
        params.container,
        params.nodesLayouts,
        params.zoomLevel,
        params.margins
      )
      expect(zoomAt).toBeUndefined()
    })

    it("should return undefined if the canvas is smaller than the fixed size area", () => {
      const params = cloneDeep(defaultParams1)
      params.container = { width: 50, height: 50 }
      const zoomAt = calculateFitWithoutScalingObjects(
        params.viewport,
        params.graphBox,
        params.container,
        params.nodesLayouts,
        params.zoomLevel,
        params.margins
      )
      expect(zoomAt).toBeUndefined()
    })
  })

  interface CalculateFitWithScalingObjectsParams {
    viewport: ViewBox
    container: Size
    nodesLayouts: NodePositions
    margins: Box
  }
  const defaultParams2: CalculateFitWithScalingObjectsParams = {
    viewport: { x: 100, y: 200, width: 600, height: 400 },
    container: { width: 1200, height: 800 },
    nodesLayouts: {
      node1: { x: 200, y: 300 },
      node2: { x: 600, y: 500 },
    },
    margins: { top: 0, left: 0, right: 0, bottom: 0 },
  }

  describe("calculateFitWithScalingObjects", () => {
    it("should be able to be calculated correctly with smaller graph", () => {
      const params = cloneDeep(defaultParams2)
      const zoomAt = calculateFitWithScalingObjects(
        params.viewport,
        params.container,
        params.nodesLayouts,
        params.margins
      )
      expect(zoomAt.pos.x).toBeCloseTo(-200, 1)
      expect(zoomAt.pos.y).toBeCloseTo(-400, 1)
      expect(zoomAt.zoom).toBeCloseTo(2, 1)
    })

    it("should be able to be calculated correctly with larger graph", () => {
      const params = cloneDeep(defaultParams2)
      params.container = { width: 600, height: 400 }
      const zoomAt = calculateFitWithScalingObjects(
        params.viewport,
        params.container,
        params.nodesLayouts,
        params.margins
      )
      expect(zoomAt.pos.x).toBeCloseTo(-100, 1)
      expect(zoomAt.pos.y).toBeCloseTo(-200, 1)
      expect(zoomAt.zoom).toBeCloseTo(1, 1)
    })

    it("should return undefined if there is less than one node", () => {
      const params = cloneDeep(defaultParams2)
      params.nodesLayouts = { node1: { x: 200, y: 300 } }
      const zoomAt = calculateFitWithScalingObjects(
        params.viewport,
        params.container,
        params.nodesLayouts,
        params.margins
      )
      expect(zoomAt).toBeUndefined()
    })

    it("should return undefined if the canvas is smaller than the margins", () => {
      const params = cloneDeep(defaultParams1)
      params.margins = { top: 400, left: 600, right: 600, bottom: 400 }
      const zoomAt = calculateFitWithoutScalingObjects(
        params.viewport,
        params.graphBox,
        params.container,
        params.nodesLayouts,
        params.zoomLevel,
        params.margins
      )
      expect(zoomAt).toBeUndefined()
    })
  })
})
