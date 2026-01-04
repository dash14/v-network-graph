import { describe, expect, it } from "vitest"
import { NodePositions } from "../../common/types"
import { AnyShapeStyle } from "../../common/configs"
import { getNodeRadius, getNodesBox } from "./node"

describe("node", () => {
  describe("getNodeRadius", () => {
    it("should return radius for circle shape", () => {
      const shape = { type: "circle", radius: 20 } as AnyShapeStyle
      expect(getNodeRadius(shape)).toBe(20)
    })

    it.each([
      ["width < height", 30, 50, 15],
      ["width > height", 60, 40, 20],
      ["width === height (square)", 40, 40, 20],
    ])("should return min(width, height) / 2 for rect shape when %s", (_, width, height, expected) => {
      const shape = { type: "rect", width, height, borderRadius: 0 } as AnyShapeStyle
      expect(getNodeRadius(shape)).toBe(expected)
    })
  })

  describe("getNodesBox", () => {
    it("should return a box if there are more than two nodes", () => {
      const layouts: NodePositions = {
        node1: { x: 10, y: 20 },
        node2: { x: 30, y: 40 },
      }
      const box = getNodesBox(layouts)
      expect(box).toStrictEqual({
        top: 20,
        left: 10,
        right: 30,
        bottom: 40,
      })
    })

    it("should return a point if the node is one", () => {
      const layouts: NodePositions = {
        node1: { x: 10, y: 20 },
      }
      const box = getNodesBox(layouts)
      expect(box).toStrictEqual({
        top: 20,
        left: 10,
        right: 10,
        bottom: 20,
      })
    })

    it("should return all-zero value box when there are 0 nodes", () => {
      const layouts: NodePositions = {}
      const box = getNodesBox(layouts)
      expect(box).toStrictEqual({ top: 0, left: 0, right: 0, bottom: 0 })
    })

    it("should handle negative coordinates", () => {
      const layouts: NodePositions = {
        node1: { x: -50, y: -30 },
        node2: { x: 20, y: 10 },
      }
      const box = getNodesBox(layouts)
      expect(box).toStrictEqual({
        top: -30,
        left: -50,
        right: 20,
        bottom: 10,
      })
    })

    it("should consider all nodes for 3+ nodes", () => {
      const layouts: NodePositions = {
        node1: { x: 0, y: 0 },
        node2: { x: 100, y: 50 },
        node3: { x: 50, y: 100 },
        node4: { x: -20, y: 30 },
      }
      const box = getNodesBox(layouts)
      expect(box).toStrictEqual({
        top: 0,
        left: -20,
        right: 100,
        bottom: 100,
      })
    })

    it("should handle nodes at the same position", () => {
      const layouts: NodePositions = {
        node1: { x: 50, y: 50 },
        node2: { x: 50, y: 50 },
        node3: { x: 50, y: 50 },
      }
      const box = getNodesBox(layouts)
      expect(box).toStrictEqual({
        top: 50,
        left: 50,
        right: 50,
        bottom: 50,
      })
    })
  })
})
