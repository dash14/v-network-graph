import { describe, it, expect } from "vitest"
import { insertAfter, removeItem } from "./array"

describe("removeItem", () => {
  describe("first element", () => {
    const target = ["abc", "def", "ghi"]
    removeItem(target, "abc")
    it("should be removed first element", () => {
      expect(["def", "ghi"]).to.be.eql(target)
    })
  })

  describe("last element", () => {
    const target = ["abc", "def", "ghi"]
    removeItem(target, "ghi")
    it("should be removed last element", () => {
      expect(["abc", "def"]).to.be.eql(target)
    })
  })

  describe("not found element", () => {
    const target = ["abc", "def", "ghi"]
    removeItem(target, "jkl")
    it("should be removed last element", () => {
      expect(["abc", "def", "ghi"]).to.be.eql(target)
    })
  })
})

describe("insertAfter", () => {
  describe("first element", () => {
    const target = ["abc", "ghi"]
    insertAfter(target, "abc", "def")
    it("should be inserted after abc", () => {
      expect(["abc", "def", "ghi"]).to.be.eql(target)
    })
  })

  describe("last element", () => {
    const target = ["abc", "def"]
    insertAfter(target, "def", "ghi")
    it("should be inserted after def", () => {
      expect(["abc", "def", "ghi"]).to.be.eql(target)
    })
  })

  describe("not found element", () => {
    const target = ["abc", "def"]
    removeItem(target, "ghi")
    it("should be not inserted", () => {
      expect(["abc", "def"]).to.be.eql(target)
    })
  })
})
