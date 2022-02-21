import { LinePosition, Position } from "@/common/types"
import { Vector2D } from "@/modules/vector2d"

// ---------------------------
// Line information by vectors
// ---------------------------

export class VectorLine {
  public source: Vector2D
  public target: Vector2D
  public v: Vector2D

  constructor(source: Vector2D, target: Vector2D, v: Vector2D) {
    this.source = source
    this.target = target
    this.v = v
  }

  static fromLinePosition(line: LinePosition): VectorLine {
    const source = Vector2D.fromObject(line.p1)
    const target = Vector2D.fromObject(line.p2)
    return new VectorLine(source, target, toLineVector(source, target))
  }

  static fromPositions(sourcePos: Position, targetPos: Position): VectorLine {
    const source = Vector2D.fromObject(sourcePos)
    const target = Vector2D.fromObject(targetPos)
    return new VectorLine(source, target, toLineVector(source, target))
  }

  static fromVectors(source: Vector2D, target: Vector2D): VectorLine {
    return new VectorLine(source, target, toLineVector(source, target))
  }
}

export function toLineVector(source: Vector2D, target: Vector2D): Vector2D {
  return target.clone().subtract(source)
}

export function toVectorsFromLinePosition(line: LinePosition): [Vector2D, Vector2D] {
  return [Vector2D.fromObject(line.p1), Vector2D.fromObject(line.p2)]
}

export function getCenterOfLinePosition(line: LinePosition): Vector2D {
  return new Vector2D((line.p1.x + line.p2.x) / 2, (line.p1.y + line.p2.y) / 2)
}

// -------------------------------
// Calculation functions for Lines
// -------------------------------

/**
 * Convert two `Position` to `LinePosition`
 * @param p1 source position of the line
 * @param p2 target position of the line
 * @returns `LinePosition` instance
 */
 export function toLinePosition(p1: Position, p2: Position): LinePosition {
  return { p1, p2 }
}

/**
 * Calculates the line position to which the margin is applied.
 * @param linePos original position of the line
 * @param sourceMargin margin for source side
 * @param targetMargin margin for target side
 * @returns the line position
 */
 export function applyMargin(
  linePos: LinePosition,
  sourceMargin: number,
  targetMargin: number
): LinePosition {
  const line = VectorLine.fromLinePosition(linePos)
  return applyMarginInner(line, sourceMargin, targetMargin)
}

function applyMarginInner(
  line: VectorLine,
  sourceMargin: number,
  targetMargin: number
): LinePosition {
  const normalized = line.v.clone().normalize()

  const sv = line.source.clone().add(normalized.clone().multiplyScalar(sourceMargin))

  const tv = line.target.clone().subtract(normalized.clone().multiplyScalar(targetMargin))

  let p1 = sv.toObject()
  let p2 = tv.toObject()

  const check = toLineVector(sv, tv)
  if (line.v.angle() * check.angle() < 0) {
    // reversed
    const c1 = new Vector2D((p1.x + p2.x) / 2, (p1.y + p2.y) / 2)
    const c2 = c1.clone().add(normalized.multiplyScalar(0.5))
    p1 = c1.toObject()
    p2 = c2.toObject()
  }

  return { p1, p2 }
}

export function inverseLine(line: LinePosition): LinePosition {
  return { p1: line.p2, p2: line.p1 }
}

export function calculatePerpendicularLine(line: VectorLine) {
  const n1 = line.v
    .clone()
    .normalize()
    .rotate(Math.PI / 2)
  return VectorLine.fromVectors(line.target, line.target.clone().add(n1))
}
