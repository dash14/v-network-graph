import { Node, NodeStyle, Position, Size } from "./types"

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
  targetNodeSize: Size,
): boolean {
  // x方向の衝突チェック
  const distanceX = Math.abs(nodePos.x - targetNodePos.x)
  const collisionX = distanceX < nodeSize.width / 2 + targetNodeSize.width / 2

  // y方向の衝突チェック
  const distanceY = Math.abs(nodePos.y - targetNodePos.y)
  const collisionY = distanceY < nodeSize.height / 2 + targetNodeSize.height / 2
  return collisionX && collisionY
}
