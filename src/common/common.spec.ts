import { describe, expect, it } from "vitest"
import { reactive, isReactive } from "vue"
import { Reactive, nonNull } from "./common"

describe("common", () => {
  describe("Reactive", () => {
    it("should return reactive object when given a plain object", () => {
      const obj = { name: "test", value: 123 }
      const result = Reactive(obj)
      expect(isReactive(result)).toBe(true)
      expect(result.name).toBe("test")
      expect(result.value).toBe(123)
    })

    it("should return the same object when given an already reactive object", () => {
      const obj = { name: "test", value: 456 }
      const reactiveObj = reactive(obj)
      const result = Reactive(reactiveObj)
      expect(result).toBe(reactiveObj)
      expect(isReactive(result)).toBe(true)
    })

    it.each([
      ["nested object", { nested: { a: 1, b: 2 } }],
      ["array", [1, 2, 3]],
      ["empty object", {}],
      ["object with array", { items: [1, 2, 3] }],
    ])("should work with %s", (_, input) => {
      const result = Reactive(input)
      expect(isReactive(result)).toBe(true)
      expect(result).toStrictEqual(input)
    })
  })

  describe("nonNull", () => {
    it.each([
      ["string", "test"],
      ["zero", 0],
      ["false", false],
      ["empty string", ""],
      ["object", { key: "value" }],
      ["array", [1, 2, 3]],
    ])("should return the value when given %s", (_, value) => {
      const result = nonNull(value)
      expect(result).toStrictEqual(value)
    })

    it.each([
      ["null", null],
      ["undefined", undefined],
    ])("should throw error when given %s", (_, value) => {
      expect(() => nonNull(value)).toThrow("Parameter is null")
    })

    it.each([
      ["null", null, "CustomParam"],
      ["undefined", undefined, "MyValue"],
    ])("should throw error with custom name when given %s", (_, value, name) => {
      expect(() => nonNull(value, name)).toThrow(`${name} is null`)
    })
  })
})
