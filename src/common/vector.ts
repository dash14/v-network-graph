import Vector from "victor"
import { LinePosition, Position } from "./types"

interface Line {
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
    v: toLineVector(source, target)
  }
}

export function fromPositions(sourcePos: Position, targetPos: Position): Line {
  const source = Vector.fromObject(sourcePos)
  const target = Vector.fromObject(targetPos)
  return {
    source,
    target,
    v: toLineVector(source, target)
  }
}

export function fromVectors(source: Vector, target: Vector): Line {
  return {
    source,
    target,
    v: toLineVector(source, target)
  }
}

export function toLineVector(source: Vector, target: Vector) {
  return target.clone().subtract(source)
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

  return p2.add(v2.multiplyScalar(t2))
}

export { Vector }
