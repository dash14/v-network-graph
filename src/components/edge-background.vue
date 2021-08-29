<script setup lang="ts">
import { computed, PropType } from "vue"
import { useZoomLevel } from "../composables/zoom"
import { useEdgeConfig } from "../composables/config"
import { useMouseOperation } from "../composables/mouse"
import { Position } from "../common/types"
import { EdgeState } from "../composables/state"

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
  return `M ${p.x1} ${p.y1} L ${p.x2} ${p.y2}`
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
