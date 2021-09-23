import Vector from "victor"
import { LinePosition, Position } from "./types"

export interface Line {
  source: Vector
  target: Vector
  v: Vector
}

export function fromLinePosition(line: LinePosition): Line {
  const source = Vector.fromArray([line.x1, line.y1])
  const target = Vector.fromArray([line.x2, line.y2])
  return {
    source,
    target,
    v: toLineVector(source, target),
  }
}

export function fromPositions(sourcePos: Position, targetPos: Position): Line {
  const source = Vector.fromObject(sourcePos)
  const target = Vector.fromObject(targetPos)
  return {
    source,
    target,
    v: toLineVector(source, target),
  }
}

export function fromVectors(source: Vector, target: Vector): Line {
  return {
    source,
    target,
    v: toLineVector(source, target),
  }
}

export function toLineVector(source: Vector, target: Vector) {
  return target.clone().subtract(source)
}

export function toVectorsFromLinePosition(line: LinePosition): [Vector, Vector] {
  return [
    Vector.fromArray([line.x1, line.y1]),
    Vector.fromArray([line.x2, line.y2])
  ]
}

export function getCenterOfLinePosition(line: LinePosition) {
  return Vector.fromArray([
    (line.x1 + line.x2) / 2,
    (line.y1 + line.y2) / 2,
  ])
}

/**
 * Calculate the nearest point from a point to a line.
 * @param p point
 * @param line line
 * @returns point on the line
 */
export function getNearestPoint(p: Vector, line: Line): Vector {
  const n = line.v.clone().normalize()

  // Let `a` be a vector from any one point on a line to a point
  const lp = line.source
  const a = p.clone().subtract(lp)

  // Inner product of `n` and `a`
  const dot = n.dot(a)

  // The nearest point is the sum of a point on the line and a
  // vector of n multiplied by dot.
  const near = lp.clone().add(n.multiplyScalar(dot))

  return near
}

/**
 * Calculate the distance of nearest point from a point to a line.
 * @param p point
 * @param line line
 * @returns distance
 */
export function getDistanceToNearestPoint(p: Vector, line: Line): number {
  const p2 = line.source
  const v2 = line.v

  const v2len = v2.lengthSq()
  if (v2len === 0) {
    return 0
  }
  const t = v2.clone().dot(p.clone().subtract(p2)) / v2len

  const tv2 = v2.clone().multiplyScalar(t)
  const h = p2.clone().add(tv2)
  return h.subtract(p).length()
}

export function getIntersectionOfLineTargetAndCircle(
  source: Vector,
  target: Vector,
  center: Vector,
  radius: number
): Vector | null {
  // Does the node contain a point?
  const p = target.clone()
  const contains = p.subtract(center).lengthSq() < radius * radius

  if (!contains) return null // Not contained.

  // If contained, calculate the intersection point.

  // Find the nearest point `h` between `c` and the line
  const line = fromVectors(source, target)
  const h = getNearestPoint(center, line)

  // Let `hp` be the vector from `c` to `h`.
  const hp = h.clone().subtract(center)
  const hpLen = hp.length()

  // If `hpLen` is larger than the radius of the circle,
  // there is no intersection.
  if (radius < hpLen) return null

  // When a straight line and a circle are tangent, `hpLen` is `r`.
  // Then the point of contact is the nearest point between the
  // center and the line.
  if (radius === hpLen) return h

  // Let `t` be the distance from `h` to the contact point, and
  // derive t from the Three Square Theorem.
  const t = Math.sqrt(radius ** 2 - hpLen ** 2)

  // Let `tv` be the vector of the normalized direction vector of
  // the line multiplied by t
  // - intersection point 1：p + tv
  // - intersection point 2：p - tv
  const tv = line.v.normalize().multiplyScalar(t)

  // Calculate the addition or subtraction depending on which side
  // of the line to focus on.
  return h.subtract(tv)
}

/**
 * Calculate the intersection of two lines.
 * @param line1 line 1
 * @param line2 line 2
 * @returns intersection point
 */
export function getIntersectionPointOfLines(line1: Line, line2: Line): Vector {
  const p2 = line2.source
  const v = p2.clone().subtract(line1.source)

  const v1 = line1.v
  const v2 = line2.v

  const t2 = v.cross(v1) / v1.cross(v2)

  return p2.clone().add(v2.clone().multiplyScalar(t2))
}

export function calculatePerpendicularLine(line: Line) {
  const n1 = line.v.clone().normalize().rotate(Math.PI / 2)
  return fromVectors(line.target, line.target.clone().add(n1))
}

export function calculateRelativeAngleRadian(line1: Line, line2: Line) {
  return Math.atan2(
    line1.v.y * line2.v.x - line1.v.x * line2.v.y,
    line1.v.x * line2.v.x + line1.v.y * line2.v.y
  )
}

export function calculateCircleCenterAndRadiusBy3Points(
  p1: Vector,
  p2: Vector,
  p3: Vector
): [Vector, number] {
  const x1 = p1.x
  const y1 = p1.y
  const x2 = p2.x
  const y2 = p2.y
  const x3 = p3.x
  const y3 = p3.y
  const x12 = x1 - x2
  const y12 = y1 - y2
  const x32 = x3 - x2
  const y32 = y3 - y2

  const x =
    (y32 * (x12 * (x1 + x2) + y12 * (y1 + y2)) - y12 * (x32 * (x3 + x2) + y32 * (y3 + y2))) /
    (2 * x12 * y32 - 2 * y12 * x32)
  const y =
    (-x32 * (x12 * (x1 + x2) + y12 * (y1 + y2)) + x12 * (x32 * (x3 + x2) + y32 * (y3 + y2))) /
    (2 * x12 * y32 - 2 * y12 * x32)

  const radius = Math.sqrt(Math.pow(x1 - x, 2) + Math.pow(y1 - y, 2))
  const center = Vector.fromArray([x, y])
  return [center, radius]
}

export { Vector }
