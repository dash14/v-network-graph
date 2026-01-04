import { describe, it, expect } from "vitest"
import { insertAfter, removeItem } from "./array"

describe("removeItem", () => {
  it.each([
    ["first element", ["abc", "def", "ghi"], "abc", ["def", "ghi"]],
    ["middle element", ["abc", "def", "ghi"], "def", ["abc", "ghi"]],
    ["last element", ["abc", "def", "ghi"], "ghi", ["abc", "def"]],
    ["not found element", ["abc", "def", "ghi"], "xyz", ["abc", "def", "ghi"]],
  ])("should handle %s", (_, initial, toRemove, expected) => {
    const target = [...initial]
    removeItem(target, toRemove)
    expect(target).toStrictEqual(expected)
  })

  describe("boundary: empty array", () => {
    it("should not throw on empty array", () => {
      const target: string[] = []
      removeItem(target, "abc")
      expect(target).toStrictEqual([])
    })
  })

  describe("boundary: single element array", () => {
    it("should remove the only element if it matches", () => {
      const target = ["abc"]
      removeItem(target, "abc")
      expect(target).toStrictEqual([])
    })

    it("should not remove if element does not match", () => {
      const target = ["abc"]
      removeItem(target, "xyz")
      expect(target).toStrictEqual(["abc"])
    })
  })

  describe("boundary: duplicate elements", () => {
    it("should remove only the first occurrence", () => {
      const target = ["abc", "def", "abc", "ghi"]
      removeItem(target, "abc")
      expect(target).toStrictEqual(["def", "abc", "ghi"])
    })
  })

  describe("with number type", () => {
    it.each([
      ["first element", [1, 2, 3], 1, [2, 3]],
      ["middle element", [1, 2, 3], 2, [1, 3]],
      ["last element", [1, 2, 3], 3, [1, 2]],
      ["not found", [1, 2, 3], 99, [1, 2, 3]],
    ])("should remove %s", (_, initial, toRemove, expected) => {
      const target = [...initial]
      removeItem(target, toRemove)
      expect(target).toStrictEqual(expected)
    })
  })
})

describe("insertAfter", () => {
  it.each([
    ["first element", ["abc", "ghi"], "abc", "def", ["abc", "def", "ghi"]],
    ["middle element", ["abc", "def", "jkl"], "def", "ghi", ["abc", "def", "ghi", "jkl"]],
    ["last element", ["abc", "def"], "def", "ghi", ["abc", "def", "ghi"]],
    ["not found element", ["abc", "def"], "xyz", "ghi", ["abc", "def"]],
  ])("should insert after %s", (_, initial, base, value, expected) => {
    const target = [...initial]
    insertAfter(target, base, value)
    expect(target).toStrictEqual(expected)
  })

  describe("boundary: empty array", () => {
    it("should not insert on empty array", () => {
      const target: string[] = []
      insertAfter(target, "abc", "def")
      expect(target).toStrictEqual([])
    })
  })

  describe("boundary: single element array", () => {
    it("should insert after the only element if it matches", () => {
      const target = ["abc"]
      insertAfter(target, "abc", "def")
      expect(target).toStrictEqual(["abc", "def"])
    })

    it("should not insert if element does not match", () => {
      const target = ["abc"]
      insertAfter(target, "xyz", "def")
      expect(target).toStrictEqual(["abc"])
    })
  })

  describe("boundary: duplicate elements", () => {
    it("should insert after the first occurrence only", () => {
      const target = ["abc", "def", "abc", "ghi"]
      insertAfter(target, "abc", "NEW")
      expect(target).toStrictEqual(["abc", "NEW", "def", "abc", "ghi"])
    })
  })

  describe("with number type", () => {
    it.each([
      ["first element", [1, 3], 1, 2, [1, 2, 3]],
      ["middle element", [1, 2, 4], 2, 3, [1, 2, 3, 4]],
      ["last element", [1, 2], 2, 3, [1, 2, 3]],
      ["not found", [1, 2], 99, 3, [1, 2]],
    ])("should insert after %s", (_, initial, base, value, expected) => {
      const target = [...initial]
      insertAfter(target, base, value)
      expect(target).toStrictEqual(expected)
    })
  })
})
