import { AnyShapeStyle } from "@/common/configs"
import { Box, NodePositions } from "@/common/types"

export function getNodeRadius(shape: AnyShapeStyle) {
  if (shape.type == "circle") {
    return shape.radius
  } else {
    return Math.min(shape.width, shape.height) / 2
  }
}

export function getNodesBox(layouts: NodePositions): Box {
  const positions = Object.values(layouts)
  if (positions.length === 0) {
    return {
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
    }
  }

  const result = {
    top: positions[0].y,
    bottom: positions[0].y,
    left: positions[0].x,
    right: positions[0].x,
  }

  positions.forEach(pos => {
    result.top = Math.min(pos.y, result.top)
    result.bottom = Math.max(pos.y, result.bottom)
    result.left = Math.min(pos.x, result.left)
    result.right = Math.max(pos.x, result.right)
  })

  return result
}
