import { describe, it, expect } from "vitest"
import { pairwise } from "./iterate"

describe("pairwise", () => {
  it.each([
    ["empty array", [] as string[], []],
    ["one element", ["abc"], []],
    ["two elements", ["abc", "def"], [["abc", "def"]]],
    ["three elements", ["abc", "def", "ghi"], [["abc", "def"], ["def", "ghi"]]],
    [
      "four elements",
      ["a", "b", "c", "d"],
      [["a", "b"], ["b", "c"], ["c", "d"]],
    ],
  ])("should handle %s", (_, input, expected) => {
    const result: [string, string][] = []
    pairwise(input, (p1, p2) => result.push([p1, p2]))
    expect(result).toStrictEqual(expected)
  })

  describe("with number type", () => {
    it.each([
      ["empty array", [] as number[], []],
      ["one element", [1], []],
      ["two elements", [1, 2], [[1, 2]]],
      ["three elements", [1, 2, 3], [[1, 2], [2, 3]]],
      ["four elements", [1, 2, 3, 4], [[1, 2], [2, 3], [3, 4]]],
    ])("should handle %s", (_, input, expected) => {
      const result: [number, number][] = []
      pairwise(input, (p1, p2) => result.push([p1, p2]))
      expect(result).toStrictEqual(expected)
    })
  })

  it("should call callback n-1 times for array of length n", () => {
    const lengths = [0, 1, 2, 3, 5, 10]
    for (const len of lengths) {
      const arr = Array.from({ length: len }, (_, i) => i)
      let callCount = 0
      pairwise(arr, () => callCount++)
      expect(callCount).toBe(Math.max(0, len - 1))
    }
  })
})
