import { describe, expect, it } from "vitest";
import { CircleShapeStyle } from "@/common/configs"
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

      expect(sourceMargin).to.equal(10)
      expect(targetMargin).to.equal(16)
    })
  })
})