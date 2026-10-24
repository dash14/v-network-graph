import { toRaw } from "vue"
import { NodePositions, Position } from "@/common/types"

/**
 * Get the position where a node is drawn: a missing or invalid coordinate is 0.
 * Reading a reactive `positions` tracks the position of the node.
 * @param positions the positions of the nodes
 * @param id the node ID
 * @returns a copy of the position
 */
export function positionOf(positions: Readonly<NodePositions>, id: string): Position {
  const p = positions[id]
  return { x: toCoordinate(p?.x), y: toCoordinate(p?.y) }
}

/**
 * Same as `positionOf`, without tracking the position.
 * @param positions the positions of the nodes
 * @param id the node ID
 * @returns the position, which is the raw given one itself when it is valid
 */
export function untrackedPositionOf(positions: Readonly<NodePositions>, id: string): Position {
  // The positions themselves can be readonly proxies, which a reactive object keeps as they are.
  const p = toRaw(toRaw(positions)[id])
  if (p && isCoordinate(p.x) && isCoordinate(p.y)) return p
  return { x: toCoordinate(p?.x), y: toCoordinate(p?.y) }
}

function isCoordinate(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v)
}

function toCoordinate(v: unknown): number {
  if (isCoordinate(v)) return v
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}
