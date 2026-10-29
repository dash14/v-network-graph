import { computed, ref, shallowRef, toRaw, watchEffect } from "vue"
import { NodeLabelDirection, OppositeNodes } from "@/common/configs"
import { Position } from "@/common/types"
import { useCurrentPositions } from "@/composables/currentPositions"
import { useLayouts } from "@/composables/layout"
import { useStates } from "@/composables/state"
import { useZoomLevel } from "@/composables/zoom"
import { NodeState } from "@/models/node"
import { handleNodeLabelAutoAdjustment } from "@/modules/node/label"

const copyPosition = ({ x, y }: Position): Position => ({ x, y })

/**
 * Where the label of a node is drawn, relative to the node.
 * @param props the id and the state of the node
 * @returns the alignment of the text and its offset from the node
 */
export function useNodeLabelPlacement(props: { id: string; state: NodeState }) {
  const { edgeStates } = useStates()
  const { scale } = useZoomLevel()
  const layouts = useLayouts()
  const currentPositions = useCurrentPositions()

  const labelMargin = computed(() => {
    if (props.state.label.direction === NodeLabelDirection.CENTER) {
      return 0
    } else {
      return props.state.label.margin * scale.value
    }
  })

  const labelShiftV = ref(0) // Amount of label shift (vertical)
  const labelShiftH = ref(0) // Amount of label shift (horizontal)
  const labelDiagonalShiftV = ref(0) // Amount of shift in diagonal direction (vertical)
  const labelDiagonalShiftH = ref(0) // Amount of shift in diagonal direction (horizontal)

  // Taken out in the tracked effect below, so that the adjustments as the nodes move read plain
  // values.
  let label = props.state.label
  let oppositeNodeIds: [edgeId: string, nodeId: string][] = []

  // The DOM gets the positions from the position writer; they are read here only to adjust the
  // direction, where the nodes are now. Untracked, as the moves are listened for instead.
  const adjustDirection = () => {
    const { direction, directionAutoAdjustment: autoAdjustment } = label
    if (autoAdjustment === false) {
      return direction
    }

    // Copies, as the positions can be the objects in the layouts, which the user's function gets.
    const pos = copyPosition(currentPositions.of(props.id))
    const positions = toRaw(layouts).nodes
    const oppositeNodes: OppositeNodes = {}
    for (const [edgeId, nodeId] of oppositeNodeIds) {
      if (nodeId in positions) {
        oppositeNodes[edgeId] = { nodeId, pos: copyPosition(currentPositions.of(nodeId)) }
      }
    }
    if (autoAdjustment === true) {
      return handleNodeLabelAutoAdjustment(
        props.state.id,
        pos,
        oppositeNodes,
        // The loop as it lies from its node, put where the node is drawn: while a layout draws
        // ahead, the states stay where the layouts have the node.
        (edgeId: string) => {
          const edge = edgeStates[edgeId]
          if (!edge?.loop) return undefined
          const { center } = edge.loop
          const node = edge.origin.p1
          return { x: pos.x + center.x - node.x, y: pos.y + center.y - node.y }
        },
        direction
      )
    } else {
      return (
        autoAdjustment({
          nodeId: props.state.id,
          pos,
          oppositeNodes,
        }) ?? direction
      )
    }
  }

  // Set only when it changes, so that a label re-renders only then, though a layout tick moves
  // every node.
  const labelDirection = shallowRef(props.state.label.direction)
  const adjust = () => (labelDirection.value = adjustDirection())
  watchEffect(() => {
    label = props.state.label
    oppositeNodeIds = Object.entries(props.state.oppositeNodeIds)
    adjust()
  })
  watchEffect(onCleanup => {
    if (props.state.label.directionAutoAdjustment === false) return
    const isMoved = (ids: ReadonlySet<string>) =>
      ids.has(props.id) || oppositeNodeIds.some(([, id]) => ids.has(id))
    const stopDrawn = currentPositions.onDrawn(adjust)
    const stopMoved = currentPositions.onMoved(ids => isMoved(ids) && adjust())
    onCleanup(() => {
      stopDrawn()
      stopMoved()
    })
  })

  const textAnchor = computed(() => {
    switch (labelDirection.value) {
      case NodeLabelDirection.CENTER:
      case NodeLabelDirection.NORTH:
      case NodeLabelDirection.SOUTH:
        return "middle"
      case NodeLabelDirection.EAST:
      case NodeLabelDirection.NORTH_EAST:
      case NodeLabelDirection.SOUTH_EAST:
        return "start"
      case NodeLabelDirection.WEST:
      case NodeLabelDirection.NORTH_WEST:
      case NodeLabelDirection.SOUTH_WEST:
      default:
        return "end"
    }
  })

  const dominantBaseline = computed(() => {
    switch (labelDirection.value) {
      case NodeLabelDirection.NORTH:
      case NodeLabelDirection.NORTH_EAST:
      case NodeLabelDirection.NORTH_WEST:
        return "text-top"
      case NodeLabelDirection.SOUTH:
      case NodeLabelDirection.SOUTH_EAST:
      case NodeLabelDirection.SOUTH_WEST:
        return "hanging"
      case NodeLabelDirection.CENTER:
      case NodeLabelDirection.EAST:
      case NodeLabelDirection.WEST:
      default:
        return "central"
    }
  })

  const labelX = computed(() => {
    switch (labelDirection.value) {
      case NodeLabelDirection.CENTER:
      case NodeLabelDirection.NORTH:
      case NodeLabelDirection.SOUTH:
        return 0
      case NodeLabelDirection.EAST:
        return labelShiftH.value
      case NodeLabelDirection.WEST:
        return -labelShiftH.value
      case NodeLabelDirection.NORTH_EAST:
      case NodeLabelDirection.SOUTH_EAST:
        return labelDiagonalShiftH.value
      case NodeLabelDirection.NORTH_WEST:
      case NodeLabelDirection.SOUTH_WEST:
      default:
        return -labelDiagonalShiftH.value
    }
  })

  const labelY = computed(() => {
    switch (labelDirection.value) {
      case NodeLabelDirection.NORTH:
        return -labelShiftV.value
      case NodeLabelDirection.SOUTH:
        return labelShiftV.value
      case NodeLabelDirection.CENTER:
      case NodeLabelDirection.EAST:
      case NodeLabelDirection.WEST:
        return 0
      case NodeLabelDirection.NORTH_EAST:
      case NodeLabelDirection.NORTH_WEST:
        return -labelDiagonalShiftV.value
      case NodeLabelDirection.SOUTH_EAST:
      case NodeLabelDirection.SOUTH_WEST:
      default:
        return labelDiagonalShiftV.value
    }
  })

  watchEffect(() => {
    const s = scale.value
    const shape = props.state.shape
    if (shape.type == "circle") {
      const radius = shape.radius * s
      const m = radius + labelMargin.value
      const diagonalMargin = Math.sqrt(m ** 2 / 2)
      labelShiftV.value = radius + labelMargin.value
      labelShiftH.value = radius + labelMargin.value
      labelDiagonalShiftV.value = diagonalMargin
      labelDiagonalShiftH.value = diagonalMargin
    } else {
      const borderRadius = shape.borderRadius * s
      const width = shape.width * s
      const height = shape.height * s
      const m = borderRadius + labelMargin.value
      const diagonalMargin = Math.sqrt(m ** 2 / 2)
      labelShiftV.value = height / 2 + labelMargin.value
      labelShiftH.value = width / 2 + labelMargin.value
      labelDiagonalShiftV.value = height / 2 - borderRadius + diagonalMargin
      labelDiagonalShiftH.value = width / 2 - borderRadius + diagonalMargin
    }
  })

  return { textAnchor, dominantBaseline, labelX, labelY }
}
