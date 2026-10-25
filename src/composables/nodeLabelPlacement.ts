import { computed, ref, watchEffect } from "vue"
import { NodeLabelDirection } from "@/common/configs"
import { useLayouts } from "@/composables/layout"
import { useStates } from "@/composables/state"
import { useZoomLevel } from "@/composables/zoom"
import { NodeState } from "@/models/node"
import { handleNodeLabelAutoAdjustment } from "@/modules/node/label"
import { positionOf } from "@/modules/node/position"

/**
 * Where the label of a node is drawn, relative to the node.
 * @param props the id and the state of the node
 * @returns the alignment of the text and its offset from the node
 */
export function useNodeLabelPlacement(props: { id: string; state: NodeState }) {
  const { edgeStates } = useStates()
  const { scale } = useZoomLevel()
  const layouts = useLayouts()

  // The DOM gets the position from the position writer; it is read here only to adjust the direction.
  const x = computed(() => positionOf(layouts.nodes, props.id).x)
  const y = computed(() => positionOf(layouts.nodes, props.id).y)

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

  const labelDirection = computed(() => {
    const direction = props.state.label.direction
    const autoAdjustment = props.state.label.directionAutoAdjustment
    if (autoAdjustment === false) {
      return direction
    }

    const pos = { x: x.value, y: y.value }
    if (autoAdjustment === true) {
      return handleNodeLabelAutoAdjustment(
        props.state.id,
        pos,
        props.state.oppositeNodes,
        (edgeId: string) => edgeStates[edgeId]?.loop?.center,
        direction
      )
    } else {
      return (
        autoAdjustment({
          nodeId: props.state.id,
          pos,
          oppositeNodes: props.state.oppositeNodes,
        }) ?? direction
      )
    }
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
