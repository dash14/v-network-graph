import { describe, expect, it } from "vitest";
import { CircleShapeStyle, RectangleShapeStyle } from "@/common/configs"
import * as v2d from "@/modules/calculation/2d"

describe("calculateDistancesFromCenterOfNodeToEndOfNode", () => {
  describe("circle to circle", () => {
    const sourceShape: CircleShapeStyle = {
      type: "circle",
      radius: 10,
      strokeWidth: 0,
      color: "#fff"
    }
    const targetShape: CircleShapeStyle = {
      type: "circle",
      radius: 15,
      strokeWidth: 2,
      color: "#fff"
    }

    it("should radius with half of stroke width", () => {
      const sourcePos = { x: 10, y: 10 }
      const targetPos = { x: 110, y: 110 }

      const [sourceMargin, targetMargin] = v2d.calculateDistancesFromCenterOfNodeToEndOfNode(
        sourcePos, targetPos, sourceShape, targetShape
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
      color: "#fff"
    }
    const targetShape: RectangleShapeStyle = {
      type: "rect",
      width: 40,
      height: 30,
      borderRadius: 0,
      strokeWidth: 4,
      color: "#fff"
    }

    it("should calculate correctly: vertically aligned", () => {
      const sourcePos = { x: 10, y: 10 }
      const targetPos = { x: 10, y: 110 }

      const [sourceMargin, targetMargin] = v2d.calculateDistancesFromCenterOfNodeToEndOfNode(
        sourcePos, targetPos, sourceShape, targetShape
      )

      expect(sourceMargin).to.be.equal(11) // half of height + stroke
      expect(targetMargin).to.be.equal(17)
    })

    it("should calculate correctly: horizontally aligned", () => {
      const sourcePos = { x: 10, y: 10 }
      const targetPos = { x: 210, y: 10 }

      const [sourceMargin, targetMargin] = v2d.calculateDistancesFromCenterOfNodeToEndOfNode(
        sourcePos, targetPos, sourceShape, targetShape
      )

      expect(sourceMargin).to.be.equal(51) // half of width + stroke
      expect(targetMargin).to.be.equal(22)
    })

    it("should calculate correctly: located at an angle", () => {
      const sourcePos = { x: 10, y: 10 }
      const targetPos = { x: 60, y: 60 }

      const [sourceMargin, targetMargin] = v2d.calculateDistancesFromCenterOfNodeToEndOfNode(
        sourcePos, targetPos, sourceShape, targetShape
      )

      expect(sourceMargin).toBeCloseTo(Math.sqrt(11**2 + 11**2))
      expect(targetMargin).toBeCloseTo(Math.sqrt(17**2 + 17**2))
    })
  })

  describe("rounded rect to rounded rect", () => {
    const sourceShape: RectangleShapeStyle = {
      type: "rect",
      width: 40,
      height: 40,
      borderRadius: 10,
      strokeWidth: 2,
      color: "#fff"
    }
    const targetShape: RectangleShapeStyle = {
      type: "rect",
      width: 40,
      height: 40,
      borderRadius: 20,
      strokeWidth: 4,
      color: "#fff"
    }

    it("should calculate correctly: located at an angle 1", () => {
      const sourcePos = { x: 10, y: 10 }
      const targetPos = { x: 100, y: 100 }

      const [sourceMargin, targetMargin] = v2d.calculateDistancesFromCenterOfNodeToEndOfNode(
        sourcePos, targetPos, sourceShape, targetShape
      )

      expect(sourceMargin).toBeCloseTo(25.142)
      expect(targetMargin).toBeCloseTo(22)
    })

    it("should calculate correctly: located at an angle 2", () => {
      const sourcePos = { x: 10, y: 10 }
      const targetPos = { x: 140, y: 100 }

      const [sourceMargin, targetMargin] = v2d.calculateDistancesFromCenterOfNodeToEndOfNode(
        sourcePos, targetPos, sourceShape, targetShape
      )

      expect(sourceMargin).toBeCloseTo(24.619)
      expect(targetMargin).toBeCloseTo(22)
    })
  })
})