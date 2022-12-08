import { NodeLabelDirection, NodeLabelDirectionType, OppositeNodes } from "@/common/configs"
import { Position } from "@/common/types"
import { subtract, angleDegree } from "@/modules/vector2d"

const labelDirections: Record<NodeLabelDirectionType, number> = {
  [NodeLabelDirection.NORTH]: 0,
  [NodeLabelDirection.NORTH_EAST]: 1,
  [NodeLabelDirection.EAST]: 2,
  [NodeLabelDirection.SOUTH_EAST]: 3,
  [NodeLabelDirection.SOUTH]: 4,
  [NodeLabelDirection.SOUTH_WEST]: 5,
  [NodeLabelDirection.WEST]: 6,
  [NodeLabelDirection.NORTH_WEST]: 7,
  [NodeLabelDirection.CENTER]: -1,
}

const denyAngles: ((a: number, loop: boolean) => boolean)[] = [
  /* N */ (a, loop) => inRange(a, 0, loop ? 90 : 60),
  /* NE */ (a, loop) => inRange(a, 45, loop ? 90 : 45),
  /* E */ (a, loop) => inRange(a, 90, loop ? 60 : 30),
  /* SE */ (a, loop) => inRange(a, 135, loop ? 90 : 45),
  /* S */ (a, loop) => inRange(a, 180, loop ? 90 : 60),
  /* SW */ (a, loop) => inRange(a, 225, loop ? 90 : 45),
  /* W */ (a, loop) => inRange(a, 270, loop ? 60 : 30),
  /* NW */ (a, loop) => inRange(a, 315, loop ? 90 : 45),
]

export function handleNodeLabelAutoAdjustment(
  nodeId: string,
  currentPos: Position,
  oppositeNodes: OppositeNodes,
  getLoopCenter: (edgeId: string) => Position | undefined,
  defaultDirection: NodeLabelDirectionType
): NodeLabelDirectionType {
  if (defaultDirection === NodeLabelDirection.CENTER) {
    return NodeLabelDirection.CENTER
  }

  // Avoid overlapping edges from the node.
  const angles: [number, boolean][] = []
  Object.entries(oppositeNodes).forEach(([edgeId, oppositeNode]) => {
    let isSelfLoop = false
    if (oppositeNode.nodeId === nodeId) {
      // self looped edge
      const center = getLoopCenter(edgeId)
      if (center) {
        isSelfLoop = true
        oppositeNode = {
          ...oppositeNode,
          pos: { x: center.x, y: center.y },
        }
      }
    }
    // angleDegree(): east=0, north=90, west=180, south=-90
    // -> Divide into 10 azimuths except horizontal, and assign indexes including
    //    horizontal in clockwise direction
    const angle = (angleDegree(subtract(oppositeNode.pos, currentPos)) + 360 + 90) % 360
    angles.push([angle, isSelfLoop])
  })

  const directionIndex = directionToIndex(defaultDirection)

  // order of priority.
  const candidates = [
    directionIndex,
    (directionIndex + 4) % 8, // priority is given to diagonals
    (directionIndex + 2) % 8,
    (directionIndex - 2 + 8) % 8,
    (directionIndex + 1) % 8,
    (directionIndex - 1 + 8) % 8,
    (directionIndex + 3) % 8,
    (directionIndex - 3 + 8) % 8,
  ]

  const azimuth = candidates.find(c => {
    return angles.every(a => !denyAngles[c](...a))
  })
  if (azimuth === undefined) {
    return defaultDirection
  } else {
    return indexToDirection(azimuth, defaultDirection)
  }
}

function inRange(target: number, center: number, amount: number): boolean {
  target %= 360
  const min = (center - amount + 360) % 360
  const max = (center + amount) % 360
  if (min <= max) {
    return min < target && target < max
  } else {
    return min < target || target < max
  }
}

function directionToIndex(direction: NodeLabelDirectionType) {
  return labelDirections[direction] ?? 0
}

function indexToDirection(index: number, defaultValue: NodeLabelDirectionType) {
  return (Object.entries(labelDirections)[index]?.[0] ?? defaultValue) as NodeLabelDirectionType
}
