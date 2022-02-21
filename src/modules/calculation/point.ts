import V, { Vector2D } from "@/modules/vector2d"
import { VectorLine } from "./line"

/**
 * Calculate the nearest point from a point to a line.
 * @param p point
 * @param line line
 * @returns point on the line
 */
export function getNearestPoint(p: Vector2D, line: VectorLine): Vector2D {
  const n = line.v.clone().normalize()

  // Let `a` be a vector from any one point on a line to a point
  const lp = line.source
  const a = V.subtract(p, lp)

  // Inner product of `n` and `a`
  const dot = n.dot(a)

  // The nearest point is the sum of a point on the line and a
  // vector of n multiplied by dot.
  const near = lp.clone().add(n.multiplyScalar(dot))

  return near
}

// /**
//  * Calculate the distance of nearest point from a point to a line.
//  * @param p point
//  * @param line line
//  * @returns distance
//  */
// export function getDistanceToNearestPoint(p: Vector2D, line: VectorLine): number {
//   const p2 = line.source
//   const v2 = line.v

//   const v2len = v2.lengthSquared()
//   if (v2len === 0) {
//     return 0
//   }
//   const t = V.dot(v2, V.subtract(p, p2)) / v2len
//   const tv2 = V.multiplyScalar(v2, t)
//   const h = p2.clone().add(tv2)
//   return h.subtract(p).length()
// }

export function getIntersectionOfLineTargetAndCircle(
  source: Vector2D,
  target: Vector2D,
  center: Vector2D,
  radius: number
): Vector2D | null {
  // Does the node contain a point?
  const length = V.lengthSquared(V.subtract(target, center))
  const contains = length - radius * radius <= Math.pow(1, -10)

  if (!contains) return null // Not contained.

  // If contained, calculate the intersection point.

  // Find the nearest point `h` between `c` and the line
  const line = VectorLine.fromVectors(source, target)
  const h = getNearestPoint(center, line)

  // Let `hp` be the vector from `c` to `h`.
  const hpLen = V.length(V.subtract(h, center))

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
  source: Vector2D,
  target: Vector2D,
  center: Vector2D,
  radius: number,
  nearBy: Vector2D
): Vector2D | null {
  // Does the node contain a point?
  const length = V.lengthSquared(V.subtract(target, center))
  const contains = length - radius * radius <= Math.pow(1, -10)

  if (!contains) return null // Not contained.

  // If contained, calculate the intersection point.

  // Find the nearest point `h` between `c` and the line
  const line = VectorLine.fromVectors(source, target)
  const h = getNearestPoint(center, line)

  // Let `hp` be the vector from `c` to `h`.
  const hpLen = V.length(V.subtract(h, center))

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

  const d1 = nearBy.distance(ip1)
  const d2 = nearBy.distance(ip2)

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
export function getIntersectionPointOfLines(line1: VectorLine, line2: VectorLine): Vector2D {
  const v = V.subtract(line2.source, line1.source)

  const v1 = line1.v
  const v2 = line2.v

  const t2 = V.cross(v, v1) / V.cross(v1, v2)

  return line2.source.clone().add(v2.clone().multiplyScalar(t2))
}

export function getIntersectionOfCircles(
  center1: Vector2D,
  radius1: number,
  center2: Vector2D,
  radius2: number,
  near: Vector2D
): Vector2D | null {
  const c1 = center1
  const c2 = center2

  // vector of C1-->C2
  const vC1C2 = c2.clone().subtract(c1)

  // length of C1--C2
  const a = vC1C2.length()

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
  const n2 = new Vector2D(-n1.y, n1.x)

  // The point of intersection [P]
  // P  = C1 + tn1 + sn2
  // P' = C1 + tn1 - sn2
  const tn1 = n1.clone().multiplyScalar(rc)
  const sn2 = n2.clone().multiplyScalar(rs)

  const result1 = center1.clone().add(tn1).add(sn2)
  const result2 = center1.clone().add(tn1).subtract(sn2)

  const d1 = result1.distance(near)
  const d2 = result2.distance(near)

  return d1 < d2 ? result1 : result2
}
