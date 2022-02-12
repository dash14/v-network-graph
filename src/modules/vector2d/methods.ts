import { Point2D } from "./core"

export function add(v1: Point2D, v2: Point2D): Point2D
export function add<T extends Point2D>(v1: Point2D, v2: Point2D, target: T): T
export function add(v1: Point2D, v2: Point2D, target?: Point2D): Point2D {
  if (!target) {
    target = { x: 0, y: 0 }
  }
  target.x = v1.x + v2.x
  target.y = v1.y + v2.y
  return target
}

export function subtract(v1: Point2D, v2: Point2D): Point2D
export function subtract<T extends Point2D>(v1: Point2D, v2: Point2D, target: T): T
export function subtract(v1: Point2D, v2: Point2D, target?: Point2D): Point2D {
  if (!target) {
    target = { x: 0, y: 0 }
  }
  target.x = v1.x - v2.x
  target.y = v1.y - v2.y
  return target
}

export function multiply(v1: Point2D, v2: Point2D): Point2D
export function multiply<T extends Point2D>(v1: Point2D, v2: Point2D, target: T): T
export function multiply(v1: Point2D, v2: Point2D, target?: Point2D): Point2D {
  if (!target) {
    target = { x: 0, y: 0 }
  }
  target.x = v1.x * v2.x
  target.y = v1.y * v2.y
  return target
}

export function multiplyScalar(v: Point2D, scalar: number): Point2D
export function multiplyScalar<T extends Point2D>(v: Point2D, scalar: number, target: T): T
export function multiplyScalar(v: Point2D, scalar: number, target?: Point2D): Point2D {
  if (!target) {
    target = { x: 0, y: 0 }
  }
  target.x = v.x * scalar
  target.y = v.y * scalar
  return target
}

export function divide(v1: Point2D, v2: Point2D): Point2D
export function divide<T extends Point2D>(v1: Point2D, v2: Point2D, target: T): T
export function divide(v1: Point2D, v2: Point2D, target?: Point2D): Point2D {
  if (!target) {
    target = { x: 0, y: 0 }
  }
  target.x = v1.x / v2.x
  target.y = v1.y / v2.y
  return target
}

export function dot(v1: Point2D, v2: Point2D): number {
  return v1.x * v2.x + v1.y * v2.y
}

export function cross(v1: Point2D, v2: Point2D): number {
  return v1.x * v2.y - v1.y * v2.x
}

export function lengthSquared(v: Point2D): number {
  return v.x * v.x + v.y * v.y
}

export function length(v: Point2D): number {
  return Math.sqrt(lengthSquared(v))
}

export function distanceSquared(v1: Point2D, v2: Point2D): number {
  const dx = v1.x - v2.x
  const dy = v1.y - v2.y
  return dx * dx + dy * dy
}

export function distance(v1: Point2D, v2: Point2D): number {
  return Math.sqrt(distanceSquared(v1, v2))
}

export function normalize(v: Point2D): Point2D
export function normalize<T extends Point2D>(v: Point2D, target: T): T
export function normalize(v: Point2D, target?: Point2D): Point2D {
  if (!target) {
    target = { x: 0, y: 0 }
  }
  const len = length(v)
  if (len === 0) {
    target.x = 1
    target.y = 0
  } else {
    divide(v, { x: len, y: len }, target)
  }
  return target
}

export function rotate(v: Point2D, angle: number): Point2D
export function rotate<T extends Point2D>(v: Point2D, angle: number, target: T): T
export function rotate(v: Point2D, angle: number, target?: Point2D): Point2D {
  if (!target) {
    target = { x: 0, y: 0 }
  }
  // rotate in radians CCW from +X axis
  const newX = v.x * Math.cos(angle) - v.y * Math.sin(angle)
  const newY = v.x * Math.sin(angle) + v.y * Math.cos(angle)
  target.x = newX
  target.y = newY
  return target
}

const DEGREES = 180 / Math.PI

function rad2deg(rad: number) {
  return rad * DEGREES
}

export function angle(v: Point2D) {
  return Math.atan2(v.y, v.x)
}

export function angleDegree(v: Point2D) {
  return rad2deg(angle(v))
}
