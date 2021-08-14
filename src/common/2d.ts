import Victor from "victor"
import { Position } from "./types"

interface Line {
  source: Position
  target: Position
}

function lineVector(line: Line): Victor {
  return Victor.fromObject(line.target).subtract(Victor.fromObject(line.source))
}

/**
 * Calculate the nearest point from a point to a line.
 * @param p point
 * @param line line
 * @returns point on the line
 */
function getNearestPoint(p: Victor, line: Line): Victor {
  const n = lineVector(line).normalize()

  // Let `a` be a vector from any one point on a line to a point
  const lp = Victor.fromObject(line.source)
  const a = p.clone().subtract(lp)

  // Inner product of `n` and `a`
  const dot = n.dot(a)

  // The nearest point is the sum of a point on the line and a
  // vector of n multiplied by dot.
  const near = lp.add(n.multiplyScalar(dot))

  return near
}

/**
 * Calculate the intersection of a line and a circle.
 * @param line line
 * @param targetSide side of the line where the node is located. true: target side, false: source side
 * @param center center of the circle
 * @param radius radius of the circle
 * @returns intersection point
 */
export function getIntersectPointLineAndCircle(
  line: Line,
  targetSide: boolean,
  center: Position,
  radius: number
): Position | null {
  // Does the node contain a point?
  const p = targetSide ? Victor.fromObject(line.target) : Victor.fromObject(line.source)
  const c = Victor.fromObject(center)
  const contains = p.subtract(c).lengthSq() < radius * radius

  if (!contains) return null // Not contained.

  // If contained, calculate the intersection point.

  // Find the nearest point `h` between `c` and the line
  const h = getNearestPoint(c, line)

  // Let `hp` be the vector from `c` to `h`.
  const hp = h.clone().subtract(c)
  const hpLen = hp.length()

  // If `hpLen` is larger than the radius of the circle,
  // there is no intersection.
  if (radius < hpLen) return null

  // When a straight line and a circle are tangent, `hpLen` is `r`.
  // Then the point of contact is the nearest point between the
  // center and the line.
  if (radius === hpLen) return h.toObject()

  // Let `t` be the distance from `h` to the contact point, and
  // derive t from the Three Square Theorem.
  const t = Math.sqrt(radius ** 2 - hpLen ** 2)

  // Let `tv` be the vector of the normalized direction vector of
  // the line multiplied by t
  // - intersection point 1：p + tv
  // - intersection point 2：p - tv
  const tv = lineVector(line).normalize().multiplyScalar(t)

  // Calculate the addition or subtraction depending on which side
  // of the line to focus on.
  if (targetSide) {
    return h.subtract(tv)
  } else {
    return h.add(tv)
  }
}
