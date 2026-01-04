import { describe, it, expect } from "vitest"
import { Vector2D } from "./index"

describe("instantiate", () => {
  describe("new Vector2D()", () => {
    const instance = new Vector2D(100, 200)

    it("should be an instance of Vector2D", () => {
      expect(instance).to.be.an.instanceOf(Vector2D)
    })

    it("should have axis specified at instantiate", () => {
      expect(instance).to.have.property("x", 100)
      expect(instance).to.have.property("y", 200)
    })
  })

  describe("#fromArray()", () => {
    const instance = Vector2D.fromArray([100, 200])

    it("should be an instance of Vector2D", () => {
      expect(instance).to.be.an.instanceOf(Vector2D)
    })

    it("should have axis specified at instantiate", () => {
      expect(instance).to.have.property("x", 100)
      expect(instance).to.have.property("y", 200)
    })

    it("should return (0, 0) for empty array", () => {
      const empty = Vector2D.fromArray([])
      expect(empty).to.have.property("x", 0)
      expect(empty).to.have.property("y", 0)
    })

    it("should return (x, 0) for single element array", () => {
      const single = Vector2D.fromArray([50])
      expect(single).to.have.property("x", 50)
      expect(single).to.have.property("y", 0)
    })
  })

  describe("#fromObject()", () => {
    const instance = Vector2D.fromObject({ x: 100, y: 200 })

    it("should be an instance of Vector2D", () => {
      expect(instance).to.be.an.instanceOf(Vector2D)
    })

    it("should have axis specified at instantiate", () => {
      expect(instance).to.have.property("x", 100)
      expect(instance).to.have.property("y", 200)
    })
  })
})

describe("instance methods", () => {
  describe("#add", () => {
    const v1 = new Vector2D(10, 20)
    const v2 = new Vector2D(30, 40)
    const result = v1.add(v2)

    it("should add a vector", () => {
      expect(result.toObject()).to.eql({ x: 40, y: 60 })
    })

    it("should overwrite instance", () => {
      expect(result).to.equal(v1)
      expect(result).not.to.equal(v2)
    })
  })

  describe("#subtract", () => {
    const v1 = new Vector2D(10, 20)
    const v2 = new Vector2D(30, 10)
    const result = v1.subtract(v2)

    it("should subtract a vector", () => {
      expect(result.toObject()).to.eql({ x: -20, y: 10 })
    })

    it("should overwrite instance", () => {
      expect(result).to.equal(v1)
      expect(result).not.to.equal(v2)
    })
  })

  describe("#multiply", () => {
    const v1 = new Vector2D(10, 20)
    const v2 = new Vector2D(2, 2)
    const result = v1.multiply(v2)

    it("should multiply a vector", () => {
      expect(result.toObject()).to.eql({ x: 20, y: 40 })
    })

    it("should overwrite instance", () => {
      expect(result).to.equal(v1)
      expect(result).not.to.equal(v2)
    })
  })

  describe("#multiplyScalar", () => {
    const v = new Vector2D(10, 20)
    const result = v.multiplyScalar(2)

    it("should multiply both axis", () => {
      expect(result.toObject()).to.eql({ x: 20, y: 40 })
    })

    it("should overwrite instance", () => {
      expect(result).to.equal(v)
    })
  })

  describe("#divide", () => {
    const v1 = new Vector2D(10, 20)
    const v2 = new Vector2D(2, 2)
    const result = v1.divide(v2)

    it("should divide a vector", () => {
      expect(result.toObject()).to.eql({ x: 5, y: 10 })
    })

    it("should overwrite instance", () => {
      expect(result).to.equal(v1)
      expect(result).not.to.equal(v2)
    })
  })

  describe("#dot", () => {
    const v1 = new Vector2D(100, 100)
    const v2 = new Vector2D(200, 200)
    const result = v1.dot(v2)

    it("should calculate dot product", () => {
      expect(result).to.equal(40000)
    })
  })

  describe("#cross", () => {
    const v1 = new Vector2D(100, 100)
    const v2 = new Vector2D(400, 200)
    const result = v1.cross(v2)

    it("should calculate cross product", () => {
      expect(result).to.equal(-20000)
    })
  })

  describe("#length", () => {
    const v = new Vector2D(3, 4)
    const result1 = v.length()
    const result2 = v.lengthSquared()

    it("should calculate length", () => {
      expect(result1).to.be.equal(5)
      expect(result2).to.be.equal(25)
    })
  })

  describe("#distance", () => {
    const v1 = new Vector2D(1, 10)
    const v2 = new Vector2D(4, 6)
    const result1 = v1.distance(v2)
    const result2 = v1.distanceSquared(v2)

    it("should calculate distance", () => {
      expect(result1).to.be.equal(5)
      expect(result2).to.be.equal(25)
    })
  })

  describe("#normalize", () => {
    const v = new Vector2D(3, 4)
    const zero = new Vector2D(0, 0)
    const result1 = v.normalize()
    const result2 = zero.normalize()

    it("should normalize a vector", () => {
      expect(result1).to.be.eql({ x: 3 / 5, y: 4 / 5 })
      expect(result2).to.be.eql({ x: 1, y: 0 })
    })
  })

  describe("#angle", () => {
    const angleX = new Vector2D(100, 0).angle()
    const angleY = new Vector2D(0, 100).angle()
    const anglePi = new Vector2D(-100, 0).angle()

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

  describe("#angleDegree", () => {
    const angleX = new Vector2D(100, 0).angleDegree()
    const angleY = new Vector2D(0, 100).angleDegree()
    const anglePi = new Vector2D(-100, 0).angleDegree()

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

  describe("#rotate", () => {
    const v = new Vector2D(10, 10)
    const angle = (90 * Math.PI) / 180
    const result = v.rotate(angle)

    it("should rotate a vector", () => {
      expect(result).to.be.eql({ x: -10, y: 10 })
    })
  })

  describe("#isEqualTo", () => {
    const v = new Vector2D(10, 10)
    const result1 = v.isEqualTo({ x: 10, y: 10 })
    const result2 = v.isEqualTo({ x: -10, y: 10 })

    it("should clone, different instance", () => {
      expect(result1).to.be.equal(true)
      expect(result2).to.be.equal(false)
    })
  })

  describe("#clone", () => {
    const v = new Vector2D(10, 10)
    const result = v.clone()

    it("should clone, different instance", () => {
      expect(result.toObject()).to.be.eql({ x: 10, y: 10 })
      expect(result).not.to.be.equal(v)
    })
  })

  describe("#toObject", () => {
    it("should return a plain object with x and y", () => {
      const v = new Vector2D(30, 40)
      const obj = v.toObject()
      expect(obj).to.eql({ x: 30, y: 40 })
      expect(obj).not.to.be.an.instanceOf(Vector2D)
    })
  })

  describe("#toArray", () => {
    it("should return an array [x, y]", () => {
      const v = new Vector2D(50, 60)
      const arr = v.toArray()
      expect(arr).to.eql([50, 60])
      expect(arr).to.have.length(2)
    })

    it("should return correct values for negative coordinates", () => {
      const v = new Vector2D(-10, -20)
      const arr = v.toArray()
      expect(arr).to.eql([-10, -20])
    })
  })
})
