import { describe, it, expect } from "vitest"
import * as Methods from "./index"
import { Point2D } from "./core"

function testArgumentAndResult(v: Point2D, target: Point2D, result1: Point2D, result2: Point2D) {
  it("should not overwrite arguments", () => {
    expect(result1).to.not.equals(v)
    expect(result2).to.not.equals(v)
  })

  it("should write to target", () => {
    expect(result2).to.equal(target)
  })
}

function testArgumentsAndResult(
  v1: Point2D,
  v2: Point2D,
  target: Point2D,
  result1: Point2D,
  result2: Point2D
) {
  it("should not overwrite arguments", () => {
    expect(result1).to.not.equals(v1)
    expect(result1).to.not.equals(v2)
    expect(result2).to.not.equals(v1)
    expect(result2).to.not.equals(v2)
  })

  it("should write to target", () => {
    expect(result2).to.equal(target)
  })
}

describe("methods", () => {
  describe("add", () => {
    const v1 = { x: 10, y: 20 }
    const v2 = { x: 30, y: 40 }
    const target = { x: 0, y: 0 }

    const result1 = Methods.add(v1, v2)
    const result2 = Methods.add(v1, v2, target)

    it("should add vectors", () => {
      expect(result1).to.eql({ x: 40, y: 60 })
      expect(result2).to.eql({ x: 40, y: 60 })
    })

    testArgumentsAndResult(v1, v2, target, result1, result2)
  })

  describe("subtract", () => {
    const v1 = { x: 10, y: 20 }
    const v2 = { x: 30, y: 10 }
    const target = { x: 0, y: 0 }

    const result1 = Methods.subtract(v1, v2)
    const result2 = Methods.subtract(v1, v2, target)

    it("should subtract vectors", () => {
      expect(result1).to.eql({ x: -20, y: 10 })
      expect(result2).to.eql({ x: -20, y: 10 })
    })

    testArgumentsAndResult(v1, v2, target, result1, result2)
  })

  describe("multiply", () => {
    const v1 = { x: 10, y: 20 }
    const v2 = { x: 2, y: 2 }
    const target = { x: 0, y: 0 }

    const result1 = Methods.multiply(v1, v2)
    const result2 = Methods.multiply(v1, v2, target)

    it("should multiply vectors", () => {
      expect(result1).to.eql({ x: 20, y: 40 })
      expect(result2).to.eql({ x: 20, y: 40 })
    })

    testArgumentsAndResult(v1, v2, target, result1, result2)
  })

  describe("multiplyScalar", () => {
    const v = { x: 10, y: 20 }
    const target = { x: 0, y: 0 }

    const result1 = Methods.multiplyScalar(v, 2)
    const result2 = Methods.multiplyScalar(v, 2, target)

    it("should multiply both axis", () => {
      expect(result1).to.eql({ x: 20, y: 40 })
      expect(result2).to.eql({ x: 20, y: 40 })
    })

    testArgumentAndResult(v, target, result1, result2)
  })

  describe("divide", () => {
    const v1 = { x: 10, y: 20 }
    const v2 = { x: 2, y: 2 }
    const target = { x: 0, y: 0 }

    const result1 = Methods.divide(v1, v2)
    const result2 = Methods.divide(v1, v2, target)

    it("should divide vectors", () => {
      expect(result1).to.eql({ x: 5, y: 10 })
      expect(result2).to.eql({ x: 5, y: 10 })
    })

    testArgumentsAndResult(v1, v2, target, result1, result2)
  })

  describe("dot", () => {
    const v1 = { x: 100, y: 100 }
    const v2 = { x: 200, y: 200 }
    const result = Methods.dot(v1, v2)

    it("should calculate dot product", () => {
      expect(result).to.be.equal(40000)
    })
  })

  describe("cross", () => {
    const v1 = { x: 100, y: 100 }
    const v2 = { x: 400, y: 200 }
    const result = Methods.cross(v1, v2)

    it("should calculate cross product", () => {
      expect(result).to.be.equal(-20000)
    })
  })

  describe("length", () => {
    const v = { x: 3, y: 4 }
    const result1 = Methods.length(v)
    const result2 = Methods.lengthSquared(v)

    it("should calculate length", () => {
      expect(result1).to.be.equal(5)
      expect(result2).to.be.equal(25)
    })
  })

  describe("distance", () => {
    const v1 = { x: 1, y: 10 }
    const v2 = { x: 4, y: 6 }
    const result1 = Methods.distance(v1, v2)
    const result2 = Methods.distanceSquared(v1, v2)

    it("should calculate length", () => {
      expect(result1).to.be.equal(5)
      expect(result2).to.be.equal(25)
    })
  })

  describe("normalize", () => {
    const v = { x: 3, y: 4 }
    const zero = { x: 0, y: 0 }
    const result1 = Methods.normalize(v)
    const result2 = Methods.normalize(zero)

    it("should normalize a vector", () => {
      expect(result1).to.be.eql({ x: 3 / 5, y: 4 / 5 })
      expect(result2).to.be.eql({ x: 1, y: 0 })
    })
  })

  describe("angle", () => {
    const angleX = Methods.angle({ x: 100, y: 0 })
    const angleY = Methods.angle({ x: 0, y: 100 })
    const anglePi = Methods.angle({ x: -100, y: 0 })

    it("should x directed vector to 0 degree", () => {
      expect(angleX).to.be.equal(0)
    })
    it("should x directed vector to 90 degree", () => {
      expect(angleY).to.be.equal(Math.PI / 2)
    })
    it("should x directed vector to 180 degree", () => {
      expect(anglePi).to.be.equal(Math.PI)
    })
  })

  describe("angleDegree", () => {
    const angleX = Methods.angleDegree({ x: 100, y: 0 })
    const angleY = Methods.angleDegree({ x: 0, y: 100 })
    const anglePi = Methods.angleDegree({ x: -100, y: 0 })

    it("should x directed vector to 0 degree", () => {
      expect(angleX).to.be.equal(0)
    })
    it("should x directed vector to 90 degree", () => {
      expect(angleY).to.be.equal(90)
    })
    it("should x directed vector to 180 degree", () => {
      expect(anglePi).to.be.equal(180)
    })
  })

  describe("rotate", () => {
    const v = { x: 10, y: 10 }
    const target = { x: 0, y: 0 }
    const angle = (90 * Math.PI) / 180
    const result1 = Methods.rotate(v, angle)
    const result2 = Methods.rotate(v, angle, target)

    it("should rotate a vector", () => {
      expect(result1).to.be.eql({ x: -10, y: 10 })
      expect(result2).to.be.eql({ x: -10, y: 10 })
    })

    testArgumentAndResult(v, target, result1, result2)
  })
})
