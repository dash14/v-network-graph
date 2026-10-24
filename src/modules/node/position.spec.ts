import { describe, expect, it } from "vitest"
import { isReactive, reactive, readonly } from "vue"
import { NodePositions } from "@/common/types"
import { positionOf, untrackedPositionOf } from "./position"

describe("positionOf", () => {
  it("should return a copy of a valid position", () => {
    const p = { x: 10, y: -20, fixed: true }
    expect(positionOf({ node1: p }, "node1")).toEqual({ x: 10, y: -20 })
  })

  it("should return the origin for a missing position", () => {
    expect(positionOf({}, "node1")).toEqual({ x: 0, y: 0 })
  })

  it("should return the origin for an undefined position", () => {
    const positions = { node1: undefined } as unknown as NodePositions
    expect(positionOf(positions, "node1")).toEqual({ x: 0, y: 0 })
  })

  it("should replace each invalid coordinate with 0", () => {
    expect(positionOf({ node1: { x: NaN, y: 5 } }, "node1")).toEqual({ x: 0, y: 5 })
    expect(positionOf({ node1: { x: 5, y: Infinity } }, "node1")).toEqual({ x: 5, y: 0 })
  })

  it("should convert a numeric string", () => {
    const positions = { node1: { x: "10", y: "-5" } } as unknown as NodePositions
    expect(positionOf(positions, "node1")).toEqual({ x: 10, y: -5 })
  })

  it("should replace a coordinate neither a number nor a numeric string with 0", () => {
    const positions = { node1: { x: true, y: [3] }, node2: { x: " ", y: null } }
    const p = positions as unknown as NodePositions
    expect(positionOf(p, "node1")).toEqual({ x: 0, y: 0 })
    expect(positionOf(p, "node2")).toEqual({ x: 0, y: 0 })
  })
})

describe("untrackedPositionOf", () => {
  it("should return a valid position itself", () => {
    const p = { x: 10, y: -20 }
    expect(untrackedPositionOf({ node1: p }, "node1")).toBe(p)
  })

  it("should return the origin for an invalid position", () => {
    expect(untrackedPositionOf({ node1: { x: NaN, y: 5 } }, "node1")).toEqual({ x: 0, y: 5 })
  })

  it("should return the raw position from reactive positions", () => {
    const positions = reactive({ node1: { x: 1, y: 2 } })
    const p = untrackedPositionOf(positions, "node1")
    expect(isReactive(p)).toBe(false)
    expect(p).toEqual({ x: 1, y: 2 })
  })

  it("should return the raw position kept as a readonly proxy", () => {
    const given = { x: 1, y: 2 }
    const positions = reactive<NodePositions>({})
    positions.node1 = readonly(given)
    expect(untrackedPositionOf(positions, "node1")).toBe(given)
  })
})
