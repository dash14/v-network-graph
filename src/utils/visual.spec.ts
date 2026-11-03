import { describe, expect, it } from "vitest"
import { getFullConfigs } from "@/common/config-defaults"
import { applyScaleToDasharray, areNodesCollision, getDasharrayUnit, getNodeSize } from "./visual"

describe("visual", () => {
  describe("getNodeSize", () => {
    it("should scale the width and height of a rect node", () => {
      const style = getFullConfigs().node
      style.normal = { ...style.normal, type: "rect", width: 30, height: 20 }
      expect(getNodeSize({}, style, 2)).toEqual({ width: 60, height: 40 })
    })

    it("should scale the diameter of a circle node", () => {
      const style = getFullConfigs().node
      style.normal = { ...style.normal, type: "circle", radius: 10 }
      expect(getNodeSize({}, style, 2)).toEqual({ width: 40, height: 40 })
    })
  })

  describe("areNodesCollision", () => {
    const size = { width: 20, height: 10 }
    const targetSize = { width: 40, height: 30 }
    const collides = (x: number, y: number) =>
      areNodesCollision({ x: 0, y: 0 }, size, { x, y }, targetSize)

    it("should be true when the nodes overlap", () => {
      expect(collides(29, 19)).toBe(true)
    })

    it.each([
      ["only touching on x", 30, 0],
      ["only touching on y", 0, 20],
      ["apart on x", 35, 0],
      ["apart on y", 0, 25],
      ["apart on x but overlapping on y", 100, 0],
    ])("should be false when %s", (_, x, y) => {
      expect(collides(x, y)).toBe(false)
    })
  })

  describe("applyScaleToDasharray", () => {
    it.each([
      ["a string at scale 1 as it is", "4.5 2", 1, "4.5 2"],
      ["a scaled string, dropping what is not a number", " 4 2", 2, "8 4"],
      ["a scaled number", 4, 2, 8],
      ["none", "none", 2, "none"],
      ["undefined for undefined", undefined, 2, undefined],
      ["undefined for 0", 0, 2, undefined],
    ])("should return %s", (_, dasharray, scale, expected) => {
      expect(applyScaleToDasharray(dasharray, scale)).toBe(expected)
    })
  })

  describe("getDasharrayUnit", () => {
    it.each([undefined, "none"])("should return 0 for %s", dasharray => {
      expect(getDasharrayUnit(dasharray)).toBe(0)
    })

    it.each([
      ["an even count", " 4 2", 6],
      ["an odd count, repeated twice", "1 2 3", 12],
      ["a number, with its space", 5, 10],
    ])("should return the length of %s", (_, dasharray, expected) => {
      expect(getDasharrayUnit(dasharray)).toBe(expected)
    })
  })
})
