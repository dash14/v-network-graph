import { describe, expect, it } from "vitest"
import { NodePositions } from "../../common/types"
import { getNodesBox } from "./node"

describe("node", () => {
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
  })
})
