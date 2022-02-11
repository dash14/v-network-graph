import { Point2D } from "./core"
import {
  add,
  angle,
  angleDegree,
  cross,
  distance,
  distanceSquared,
  divide,
  dot,
  length,
  lengthSquared,
  multiply,
  multiplyScalar,
  normalize,
  rotate,
  subtract,
} from "./methods"

export class Vector2D implements Point2D {
  public x: number
  public y: number

  static fromArray(array: number[]) {
    return new Vector2D(array[0] || 0, array[1] || 0)
  }

  static fromObject(obj: Point2D) {
    return new Vector2D(obj.x, obj.y)
  }

  constructor(x: number, y: number) {
    this.x = x
    this.y = y
  }

  // instance methods
  add(v: Point2D): Vector2D {
    return add(this, v, this)
  }

  subtract(v: Point2D): Vector2D {
    return subtract(this, v, this)
  }

  multiply(v: Point2D): Vector2D {
    return multiply(this, v, this)
  }

  multiplyScalar(scalar: number): Vector2D {
    return multiplyScalar(this, scalar, this)
  }

  divide(v: Point2D): Vector2D {
    return divide(this, v, this)
  }

  dot(v: Point2D): number {
    return dot(this, v)
  }

  cross(v: Point2D): number {
    return cross(this, v)
  }

  lengthSquared(): number {
    return lengthSquared(this)
  }

  length(): number {
    return length(this)
  }

  distanceSquared(v: Point2D): number {
    return distanceSquared(this, v)
  }

  distance(v: Point2D): number {
    return distance(this, v)
  }

  normalize(): Vector2D {
    return normalize(this, this)
  }

  angle(): number {
    return angle(this)
  }

  angleDegree(): number {
    return angleDegree(this)
  }

  rotate(angle: number): Vector2D {
    return rotate(this, angle, this)
  }

  isEqualTo(v: Point2D): boolean {
    return this.x === v.x && this.y === v.y
  }

  clone(): Vector2D {
    return new Vector2D(this.x, this.y)
  }

  toObject(): Point2D {
    return { x: this.x, y: this.y }
  }

  toArray(): [number, number] {
    return [this.x, this.y]
  }
}
