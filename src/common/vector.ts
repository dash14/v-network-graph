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
  return [Vector.fromArray([line.x1, line.y1]), Vector.fromArray([line.x2, line.y2])]
}

export function getCenterOfLinePosition(line: LinePosition) {
  return Vector.fromArray([(line.x1 + line.x2) / 2, (line.y1 + line.y2) / 2])
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
  const length = p.subtract(center).lengthSq()
  const contains = length - (radius * radius) <= Math.pow(1, -10)

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

export function getIntersectionOfLineTargetAndCircle2(
  source: Vector,
  target: Vector,
  center: Vector,
  radius: number,
  nearBy: Vector
): Vector | null {
  // Does the node contain a point?
  const p = target.clone()
  const length = p.subtract(center).lengthSq()
  const contains = length - (radius * radius) <= Math.pow(1, -10)

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
  const ip1 = h.clone().add(tv)
  const ip2 = h.clone().subtract(tv)

  const d1 = calculateDistance(nearBy, ip1)
  const d2 = calculateDistance(nearBy, ip2)

  if (Math.abs(d1 - d2) < 2) {
    // Calculate the addition or subtraction depending on which side
    // of the line to focus on.
    return ip2
  }

  return d1 < d2 ? ip1 : ip2
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

export function getIntersectionOfCircles(
  center1: Vector,
  radius1: number,
  center2: Vector,
  radius2: number,
  near: Vector
): Vector | null {
  const c1 = center1
  const c2 = center2

  // vector of C1-->C2
  const vC1C2 = c2.clone().subtract(c1)

  // length of C1--C2
  const a = vC1C2.magnitude()

  const sumR = radius1 + radius2
  if (sumR < a) return null // no overlap

  // When a circle is contained, there is no contact point.
  const subR = Math.abs(radius1 - radius2)
  if (a < subR) return null

  // When the circles are circumscribed, [a] and the sum of
  // radius of two circles are equal. And there is only one
  // contact point.
  if (a === sumR) {
    const n = vC1C2.clone().normalize()
    const p = center1.clone().add(n.multiplyScalar(radius1))
    return p
  }

  // When the circles are inscribed, [a] and the difference
  // between the radius of two circles are equal. And there
  // is only one point of contact.
  if (a === subR) {
    const n = vC1C2.clone().normalize()
    const isLarge = radius1 > radius2
    // Let [P] be the contact point:
    // * C1 is larger : P = C1 + r1 * n
    // * C1 is smaller: P = C1 - r1 * n
    const p = center1.clone().add(n.multiplyScalar(isLarge ? radius1 : -radius1))
    return p
  }

  // All three sides of triangle C1C2P are known.
  // [b] := length of C1--P
  // [c] := length of C2--P
  const b = radius1
  const c = radius2

  // The cos θ of angle C1 is given by the cosine theorem:
  const cos = (a ** 2 + b ** 2 - c ** 2) / (2 * a * b)

  // Let [H] be the point where the vertical line from [P] to
  // C1--C2 is dropped, and let [rc] be the length of C1--H.
  const rc = b * cos

  // Let the length of the H--P be [rs]
  const rs = Math.sqrt(b ** 2 - rc ** 2)

  // normalized vector of vC1C2
  const n1 = vC1C2.clone().normalize()

  // vector with n1 rotated 90 degrees to the left
  const n2 = Vector.fromArray([-n1.y, n1.x])

  // The point of intersection [P]
  // P  = C1 + tn1 + sn2
  // P' = C1 + tn1 - sn2
  const tn1 = n1.clone().multiplyScalar(rc)
  const sn2 = n2.clone().multiplyScalar(rs)

  const result1 = center1.clone().add(tn1).add(sn2)
  const result2 = center1.clone().add(tn1).subtract(sn2)

  const d1 = calculateDistance(result1, near)
  const d2 = calculateDistance(result2, near)

  return d1 < d2 ? result1 : result2
}

export function calculatePerpendicularLine(line: Line) {
  const n1 = line.v
    .clone()
    .normalize()
    .rotate(Math.PI / 2)
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

/**
 * Calculate the distance of the line.
 * @param pos1 Vector
 * @param pos2 Vector
 * @returns distance
 */
export function calculateDistance(pos1: Vector, pos2: Vector) {
  const x = pos2.x - pos1.x
  const y = pos2.y - pos1.y
  return Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2))
}

export { Vector }
