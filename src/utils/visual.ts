import { Node, Position, Size } from "@/common/types"
import { Config, NodeConfig, StrokeStyle } from "@/common/configs"

export function getNodeSize(node: Node, style: NodeConfig, scale: number): Size {
  const shape = Config.values(style.normal, node)
  if (shape.type == "circle") {
    return {
      width: shape.radius * 2 * scale,
      height: shape.radius * 2 * scale,
    }
  } else {
    return {
      width: shape.width * scale,
      height: shape.height * scale,
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

export function applyScaleToDasharray(dasharray: number | string | undefined, scale: number) {
  let result: number | string = 0
  if (scale === 1 || dasharray === undefined || dasharray === "none") {
    result = dasharray ?? 0
  } else if (typeof dasharray === "string") {
    result = dasharray
      .split(/\s+/)
      .map(v => parseInt(v) * scale)
      .filter(v => !isNaN(v))
      .join(" ")
  } else {
    result = dasharray * scale
  }
  return result && result !== "0" ? result : undefined
}

export function getDasharrayUnit(dasharray: number | string | undefined) {
  let result: number | string = 0
  if (dasharray === undefined || dasharray === "none") {
    result = 0
  } else if (typeof dasharray === "string") {
    const array = dasharray
      .split(/\s+/)
      .map(v => parseInt(v))
      .filter(v => !isNaN(v))
    if (array.length % 2 === 0) {
      // ex: 1 2 -> -  -  -  - ...
      result = array.reduce((s, n) => s + n, 0)
    } else {
      // ex: 1 2 3 -> -  --- --   -  --- ...
      result = array.reduce((s, n) => s + n, 0) * 2
    }
  } else {
    result = dasharray * 2 // 2 <- border and space
  }
  return result
}

export function getAnimationSpeed(key: string, config: StrokeStyle, scale: number): Record<string, number|false> {
  const speed = config.animate
    ? getDasharrayUnit(config.dasharray) * config.animationSpeed * scale
    : false
  return {[key]: speed}
}
