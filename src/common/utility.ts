import { Node, Position, Size } from "./types"
import { NodeStyle } from "./configs"

export function keyOf<T>(obj: T): (keyof T)[] {
  return Object.keys(obj) as (keyof T)[]
}

export function entriesOf<T, K extends keyof T>(obj: T): [K, T[K]][] {
  return Object.entries(obj) as [K, T[K]][]
}

export function getNodeSize(_node: Node, style: NodeStyle, scale: number): Size {
  const shape = style.shape
  if (shape.type == "circle") {
    return {
      width: (shape.radius * 2) / scale,
      height: (shape.radius * 2) / scale,
    }
  } else {
    return {
      width: shape.width / scale,
      height: shape.height / scale,
    }
  }
}

export function areNodesCollision(
  nodePos: Position,
  nodeSize: Size,
  targetNodePos: Position,
  targetNodeSize: Size
): boolean {
  // x方向の衝突チェック
  const distanceX = Math.abs(nodePos.x - targetNodePos.x)
  const collisionX = distanceX < nodeSize.width / 2 + targetNodeSize.width / 2

  // y方向の衝突チェック
  const distanceY = Math.abs(nodePos.y - targetNodePos.y)
  const collisionY = distanceY < nodeSize.height / 2 + targetNodeSize.height / 2
  return collisionX && collisionY
}

export class MapUtil {
  static valueOf<K, V>(map: Map<K, V>) {
    return Array.from(map.values())
  }
}