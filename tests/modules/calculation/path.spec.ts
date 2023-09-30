import { describe, expect, it } from "vitest"
import { calculateDirectionsOfPathEdges } from "@/modules/calculation/path"
import { EdgeObject } from "@/models/path"

describe("calculateDirectionsOfPathEdges", () => {
  it("should return an empty array if the edges are empty", () => {
    const result = calculateDirectionsOfPathEdges([])
    expect(result).toStrictEqual([])
  })

  it("should return one true if it has one edge", () => {
    const param: EdgeObject[] = [{ edgeId: "E1", edge: { source: "n1", target: "n2" } }]
    const result = calculateDirectionsOfPathEdges(param)
    expect(result).toStrictEqual([true])
  })

  describe("Two edges", () => {
    it("should return all true when the edges are all joined in the forward direction", () => {
      // (n1) ---[E1]--> (n2) ---[E2]--> (n3)
      const param: EdgeObject[] = [
        { edgeId: "E1", edge: { source: "n1", target: "n2" } },
        { edgeId: "E2", edge: { source: "n2", target: "n3" } },
      ]
      const result = calculateDirectionsOfPathEdges(param)
      expect(result).toStrictEqual([true, true])
    })

    it("should return all false when the edges are all joined in opposite directions", () => {
      // (n1) <--[E1]--- (n2) <--[E2]--- (n3)
      const param: EdgeObject[] = [
        { edgeId: "E1", edge: { source: "n2", target: "n1" } },
        { edgeId: "E2", edge: { source: "n3", target: "n2" } },
      ]
      const result = calculateDirectionsOfPathEdges(param)
      expect(result).toStrictEqual([false, false])
    })

    it("should return [true, false] if the edges are joined forward -> reverse", () => {
      // (n1) ---[E1]--> (n2) <--[E2]--- (n3)
      const param: EdgeObject[] = [
        { edgeId: "E1", edge: { source: "n1", target: "n2" } },
        { edgeId: "E2", edge: { source: "n3", target: "n2" } },
      ]
      const result = calculateDirectionsOfPathEdges(param)
      expect(result).toStrictEqual([true, false])
    })

    it("should return [false, true] if the edges are joined reverse -> forward", () => {
      // (n1) <--[E1]--- (n2) ---[E2]--> (n3)
      const param: EdgeObject[] = [
        { edgeId: "E1", edge: { source: "n2", target: "n1" } },
        { edgeId: "E2", edge: { source: "n2", target: "n3" } },
      ]
      const result = calculateDirectionsOfPathEdges(param)
      expect(result).toStrictEqual([false, true])
    })
  })

  describe("Three edges", () => {
    it("should return all true when the edges are all joined in the forward direction", () => {
      // (n1) ---[E1]--> (n2) ---[E2]--> (n3) ---[E3]--> (n4)
      const param: EdgeObject[] = [
        { edgeId: "E1", edge: { source: "n1", target: "n2" } },
        { edgeId: "E2", edge: { source: "n2", target: "n3" } },
        { edgeId: "E3", edge: { source: "n3", target: "n4" } },
      ]
      const result = calculateDirectionsOfPathEdges(param)
      expect(result).toStrictEqual([true, true, true])
    })

    it("should return all false when the edges are all joined in opposite directions", () => {
      // (n1) <--[E1]--- (n2) <--[E2]--- (n3) <--[E3]--- (n4)
      const param: EdgeObject[] = [
        { edgeId: "E1", edge: { source: "n2", target: "n1" } },
        { edgeId: "E2", edge: { source: "n3", target: "n2" } },
        { edgeId: "E3", edge: { source: "n4", target: "n3" } },
      ]
      const result = calculateDirectionsOfPathEdges(param)
      expect(result).toStrictEqual([false, false, false])
    })

    it("should return false only for some reverse direction (the first one is forward)", () => {
      // (n1) ---[E1]--> (n2) <--[E2]--- (n3) ---[E3]--> (n4)
      const param: EdgeObject[] = [
        { edgeId: "E1", edge: { source: "n1", target: "n2" } },
        { edgeId: "E2", edge: { source: "n3", target: "n2" } },
        { edgeId: "E3", edge: { source: "n3", target: "n4" } },
      ]
      const result = calculateDirectionsOfPathEdges(param)
      expect(result).toStrictEqual([true, false, true])
    })

    it("should return false only for some reverse direction (the first one is the reverse direction)", () => {
      // (n1) <--[E1]--- (n2) ---[E2]--> (n3) <--[E3]--- (n4)
      const param: EdgeObject[] = [
        { edgeId: "E1", edge: { source: "n2", target: "n1" } },
        { edgeId: "E2", edge: { source: "n2", target: "n3" } },
        { edgeId: "E3", edge: { source: "n4", target: "n3" } },
      ]
      const result = calculateDirectionsOfPathEdges(param)
      expect(result).toStrictEqual([false, true, false])
    })
  })

  describe("When the same edge is consecutive at the start", () => {
    it("should depend on the direction of the next item in the sequence of two (forward direction)", () => {
      // (n1) ---[E1]--> (n2) <--[E1]--- (n1) ---[E2]--> (n3)
      const e1 = { edgeId: "E1", edge: { source: "n1", target: "n2" } }
      const e2 = { edgeId: "E2", edge: { source: "n1", target: "n3" } }
      const param: EdgeObject[] = [e1, e1, e2]
      const result = calculateDirectionsOfPathEdges(param)
      expect(result).toStrictEqual([true, false, true])
    })

    it("should depend on the direction of the next item in the sequence of two (opposite direction)", () => {
      // (n2) <--[E1]--- (n1) ---[E1]--> (n2) <--[E2]--- (n3)
      const e1 = { edgeId: "E1", edge: { source: "n1", target: "n2" } }
      const e2 = { edgeId: "E2", edge: { source: "n3", target: "n2" } }
      const param: EdgeObject[] = [e1, e1, e2]
      const result = calculateDirectionsOfPathEdges(param)
      expect(result).toStrictEqual([false, true, false])
    })

    it("should depend on the direction of the next item in the sequence of three (forward direction)", () => {
      // (n1) ---[E1]--> (n2) <--[E1]--- (n1) ---[E1]--> (n2) ---[E2]--> (n3)
      const e1 = { edgeId: "E1", edge: { source: "n1", target: "n2" } }
      const e2 = { edgeId: "E2", edge: { source: "n2", target: "n3" } }
      const param: EdgeObject[] = [e1, e1, e1, e2]
      const result = calculateDirectionsOfPathEdges(param)
      expect(result).toStrictEqual([true, false, true, true])
    })

    it("should depend on the direction of the next item in the sequence of three (opposite direction)", () => {
      // (n2) <--[E1]--- (n1) ---[E1]--> (n2) <--[E1]--- (n1) <--[E2]--- (n3)
      const e1 = { edgeId: "E1", edge: { source: "n1", target: "n2" } }
      const e2 = { edgeId: "E2", edge: { source: "n3", target: "n1" } }
      const param: EdgeObject[] = [e1, e1, e1, e2]
      const result = calculateDirectionsOfPathEdges(param)
      expect(result).toStrictEqual([false, true, false, false])
    })

    it("should depend on the direction of the next item in the sequence of four (forward direction)", () => {
      // (n1) ---[E1]--> (n2) <--[E1]--- (n1) ---[E1]--> (n2) <--[E1]--- (n1) ---[E2]--> (n3)
      const e1 = { edgeId: "E1", edge: { source: "n1", target: "n2" } }
      const e2 = { edgeId: "E2", edge: { source: "n1", target: "n3" } }
      const param: EdgeObject[] = [e1, e1, e1, e1, e2]
      const result = calculateDirectionsOfPathEdges(param)
      expect(result).toStrictEqual([true, false, true, false, true])
    })

    it("should depend on the direction of the next item in the sequence of four (opposite direction)", () => {
      // (n2) <--[E1]--- (n1) ---[E1]--> (n2) <--[E1]--- (n1) ---[E1]--> (n2) <--[E2]--- (n3)
      const e1 = { edgeId: "E1", edge: { source: "n1", target: "n2" } }
      const e2 = { edgeId: "E2", edge: { source: "n3", target: "n2" } }
      const param: EdgeObject[] = [e1, e1, e1, e1, e2]
      const result = calculateDirectionsOfPathEdges(param)
      expect(result).toStrictEqual([false, true, false, true, false])
    })

    it("should work even when joined with a loop edge (joint is in the forward direction)", () => {
      // (n1) ---[E1]--> (n2) <--[E1]--- (n1) ---[E1]--> (n2) <--[E2]--*
      const e1 = { edgeId: "E1", edge: { source: "n1", target: "n2" } }
      const e2 = { edgeId: "E2", edge: { source: "n2", target: "n2" } }
      const param: EdgeObject[] = [e1, e1, e1, e2]
      const result = calculateDirectionsOfPathEdges(param)
      expect(result).toStrictEqual([true, false, true, true])
    })

    it("should work even when joined with a loop edge (joint is in the opposite direction)", () => {
      // (n2) <--[E1]--- (n1) ---[E1]--> (n2) <--[E1]--- (n1) <--[E2]--*
      const e1 = { edgeId: "E1", edge: { source: "n1", target: "n2" } }
      const e2 = { edgeId: "E2", edge: { source: "n1", target: "n1" } }
      const param: EdgeObject[] = [e1, e1, e1, e2]
      const result = calculateDirectionsOfPathEdges(param)
      expect(result).toStrictEqual([false, true, false, true])
    })
  })

  describe("should start in the forward direction if it is all the same edge", () => {
    it("two edges", () => {
      const e1 = { edgeId: "E1", edge: { source: "n1", target: "n2" } }
      const param: EdgeObject[] = [e1, e1]
      const result = calculateDirectionsOfPathEdges(param)
      expect(result).toStrictEqual([true, false])
    })

    it("three edges", () => {
      const e1 = { edgeId: "E1", edge: { source: "n1", target: "n2" } }
      const param: EdgeObject[] = [e1, e1, e1]
      const result = calculateDirectionsOfPathEdges(param)
      expect(result).toStrictEqual([true, false, true])
    })

    it("four edges", () => {
      const e1 = { edgeId: "E1", edge: { source: "n1", target: "n2" } }
      const param: EdgeObject[] = [e1, e1, e1, e1]
      const result = calculateDirectionsOfPathEdges(param)
      expect(result).toStrictEqual([true, false, true, false])
    })
  })
})
