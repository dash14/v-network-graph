import { AnyShapeStyle } from "@/common/configs"
import { Position } from "@/common/types"
import * as PointUtils from "@/modules/calculation/point"
import { Vector2D } from "@/modules/vector2d"

/**
 * The outline of a node as a rectangle with rounded corners. A circle is one whose corners meet.
 */
export interface NodeOutline {
  center: Vector2D
  halfWidth: number
  halfHeight: number
  cornerRadius: number
}

// Allows for rounding where a crossing lies at the joint of a side and a corner.
const TOLERANCE = 1e-9

/**
 * Make the outline of a node, without its stroke.
 * @param shape the shape of the node
 * @param position the position of the node
 * @param scale the scale factor
 * @returns the outline
 */
export function outlineOf(shape: AnyShapeStyle, position: Position, scale: number): NodeOutline {
  const center = Vector2D.fromObject(position)
  if (shape.type === "circle") {
    const r = shape.radius * scale
    return { center, halfWidth: r, halfHeight: r, cornerRadius: r }
  }
  const halfWidth = (shape.width / 2) * scale
  const halfHeight = (shape.height / 2) * scale
  const cornerRadius = Math.min(Math.max(shape.borderRadius * scale, 0), halfWidth, halfHeight)
  return { center, halfWidth, halfHeight, cornerRadius }
}

/**
 * Calculate how far a point is outside an outline.
 * @param outline the outline
 * @param p the point
 * @returns the distance, negative inside
 */
export function distanceOutside(outline: NodeOutline, p: Position): number {
  const [qx, qy] = distancesFromInnerBox(outline, p)
  return (
    Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) +
    Math.min(Math.max(qx, qy), 0) -
    outline.cornerRadius
  )
}

/**
 * Calculate the direction pointing out of an outline at a point on it.
 * @param outline the outline
 * @param p the point
 * @returns the unit vector
 */
export function outwardNormal(outline: NodeOutline, p: Position): Vector2D {
  const [qx, qy] = distancesFromInnerBox(outline, p)
  const sx = p.x < outline.center.x ? -1 : 1
  const sy = p.y < outline.center.y ? -1 : 1
  if (qx > 0 && qy > 0) return new Vector2D(sx * qx, sy * qy).normalize()
  return qx >= qy ? new Vector2D(sx, 0) : new Vector2D(0, sy)
}

/**
 * Calculate how far an outline reaches from its center in a direction.
 * @param outline the outline
 * @param n the unit vector of the direction
 * @returns the distance to the line touching the outline across the direction
 */
export function reachOf(outline: NodeOutline, n: Position): number {
  const { halfWidth, halfHeight, cornerRadius: r } = outline
  return Math.abs(n.x) * (halfWidth - r) + Math.abs(n.y) * (halfHeight - r) + r
}

/**
 * Calculate where a circle crosses an outline.
 * @param outline the outline
 * @param center the center of the circle
 * @param radius the radius of the circle
 * @returns the crossings, in no order and possibly repeated
 */
export function crossingsOfCircle(
  outline: NodeOutline,
  center: Vector2D,
  radius: number
): Vector2D[] {
  const { center: o, halfWidth, halfHeight, cornerRadius: r } = outline
  const ix = halfWidth - r
  const iy = halfHeight - r
  const tolerance = TOLERANCE * (halfWidth + halfHeight)
  const crossings: Vector2D[] = []

  for (const s of [-1, 1]) {
    // the sides on the left and right
    const x = o.x + s * halfWidth
    const h = Math.sqrt(radius ** 2 - (x - center.x) ** 2)
    for (const y of [center.y - h, center.y + h]) {
      // A circle short of the side gives NaN, which fails the comparison.
      if (Math.abs(y - o.y) <= iy + tolerance) crossings.push(new Vector2D(x, y))
    }
    // the sides on the top and bottom
    const y = o.y + s * halfHeight
    const w = Math.sqrt(radius ** 2 - (y - center.y) ** 2)
    for (const x of [center.x - w, center.x + w]) {
      if (Math.abs(x - o.x) <= ix + tolerance) crossings.push(new Vector2D(x, y))
    }
  }

  if (r > 0) {
    for (const [sx, sy] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ]) {
      const corner = new Vector2D(o.x + sx * ix, o.y + sy * iy)
      const points = PointUtils.getIntersectionOfCircles(center, radius, corner, r) ?? []
      for (const p of points) {
        if ((p.x - corner.x) * sx >= -tolerance && (p.y - corner.y) * sy >= -tolerance) {
          crossings.push(p)
        }
      }
    }
  }
  return crossings
}

function distancesFromInnerBox(outline: NodeOutline, p: Position): [number, number] {
  const { center, halfWidth, halfHeight, cornerRadius: r } = outline
  return [Math.abs(p.x - center.x) - (halfWidth - r), Math.abs(p.y - center.y) - (halfHeight - r)]
}
