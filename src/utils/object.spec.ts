import { describe, expect, it } from "vitest"
import { isPromise, updateObjectDiff } from "./object"

describe("object", () => {
  describe("isPromise", () => {
    it.each([
      ["a promise", Promise.resolve(), true],
      ["a thenable", { then: () => {} }, true],
      ["an object without then", { then: 1 }, false],
      ["undefined", undefined, false],
    ])("should tell %s", (_, value, expected) => {
      expect(Boolean(isPromise(value))).toBe(expected)
    })
  })

  describe("updateObjectDiff", () => {
    it("should copy changed values and remove the keys missing from the source", () => {
      const target: Record<string, any> = { a: 1, b: { c: 2 }, d: 3 }
      const b = target.b
      updateObjectDiff(target, { a: 2, b: { c: 2 } })
      expect(target).toEqual({ a: 2, b: { c: 2 } })
      expect(target.b).toBe(b)
    })
  })
})
