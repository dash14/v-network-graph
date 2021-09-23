<script setup lang="ts">
import { computed, PropType } from "vue"
import { useZoomLevel } from "../composables/zoom"
import { useEdgeConfig } from "../composables/config"
import { useMouseOperation } from "../composables/mouse"
import { Position } from "../common/types"
import { EdgeState } from "../composables/state"
import chunk from "lodash-es/chunk"

const props = defineProps({
  id: {
    type: String,
    required: true,
  },
  state: {
    type: Object as PropType<EdgeState>,
    required: true,
  },
  sourcePos: {
    type: Object as PropType<Position>,
    required: false,
    default: undefined,
  },
  targetPos: {
    type: Object as PropType<Position>,
    required: false,
    default: undefined,
  },
})

const { scale } = useZoomLevel()

const config = useEdgeConfig()
const {
  handleEdgePointerDownEvent,
  handleEdgePointerOverEvent,
  handleEdgePointerOutEvent,
} = useMouseOperation()

const pathD = computed(() => {
  const p = props.state.position
  if (config.type === "straight" || !props.state.curve) {
    return `M ${p.x1} ${p.y1} L ${p.x2} ${p.y2}`
  } else {
    const points = [ ...props.state.curve.control, { x: p.x2, y: p.y2 }]
    const d: string[] = []
    d.push(`M ${p.x1} ${p.y1}`)
    chunk(points, 2).forEach(([p1, p2]) => d.push(`Q ${p1.x} ${p1.y} ${p2.x} ${p2.y}`))
    return d.join(" ")
  }
})

const strokeWidth = computed(() => (props.state.line.stroke.width + 10) * scale.value)

defineExpose({
  config,
  handleEdgePointerDownEvent,
  handleEdgePointerOverEvent,
  handleEdgePointerOutEvent,
})
</script>

<template>
  <path
    :class="{ 'v-line-background': true, selectable: config.selectable }"
    :d="pathD"
    stroke="transparent"
    :stroke-width="strokeWidth"
    fill="none"
    @pointerdown.prevent.stop="handleEdgePointerDownEvent(id, $event)"
    @pointerenter.passive="handleEdgePointerOverEvent(id, $event)"
    @pointerleave.passive="handleEdgePointerOutEvent(id, $event)"
  />
</template>

<style lang="scss" scoped>
.v-line-background {
  &.selectable {
    cursor: pointer;
  }
}
</style>
