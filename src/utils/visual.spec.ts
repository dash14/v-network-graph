import { describe, expect, it } from "vitest"
import { getFullConfigs } from "@/common/config-defaults"
import { getDasharrayUnit, getNodeSize } from "./visual"

describe("visual", () => {
  describe("getNodeSize", () => {
    it("should scale the width and height of a rect node", () => {
      const style = getFullConfigs().node
      style.normal = { ...style.normal, type: "rect", width: 30, height: 20 }
      expect(getNodeSize({}, style, 2)).toEqual({ width: 60, height: 40 })
    })
  })

  describe("getDasharrayUnit", () => {
    it.each([undefined, "none"])("should return 0 for %s", dasharray => {
      expect(getDasharrayUnit(dasharray)).toBe(0)
    })
  })
})
