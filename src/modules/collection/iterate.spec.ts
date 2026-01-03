import { describe, it, expect } from "vitest"
import { pairwise } from "./iterate"

describe("pairwise", () => {
  describe("two elements", () => {
    const target = ["abc", "def"]
    const result: [string, string][] = []
    pairwise(target, (p1, p2) => result.push([p1, p2]))
    it("should call once", () => {
      expect(1).to.be.equal(result.length)
      expect([["abc", "def"]]).to.be.eql(result)
    })
  })

  describe("three elements", () => {
    const target = ["abc", "def", "ghi"]
    const result: [string, string][] = []
    pairwise(target, (p1, p2) => result.push([p1, p2]))
    it("should call twice", () => {
      expect(2).to.be.equal(result.length)
      expect([
        ["abc", "def"],
        ["def", "ghi"],
      ]).to.be.eql(result)
    })
  })

  describe("one element", () => {
    const target = ["abc"]
    const result: [string, string][] = []
    pairwise(target, (p1, p2) => result.push([p1, p2]))
    it("should not call", () => {
      expect(0).to.be.equal(result.length)
      expect([]).to.be.eql(result)
    })
  })
})
