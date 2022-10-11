<script setup lang="ts">
import { computed } from "vue"
import { Position } from "@/common/types"
import { EdgeState } from "@/models/edge"
import { useEdgeConfig } from "@/composables/config"
import { useMouseOperation } from "@/composables/mouse"
import { useZoomLevel } from "@/composables/zoom"
import chunk from "lodash-es/chunk"

interface Props {
  id: string
  state: EdgeState
  sourcePos?: Position
  targetPos?: Position
}

const props = withDefaults(defineProps<Props>(), {
  sourcePos: undefined,
  targetPos: undefined,
})

const { scale } = useZoomLevel()

const config = useEdgeConfig()
const {
  handleEdgePointerDownEvent,
  handleEdgePointerOverEvent,
  handleEdgePointerOutEvent,
  handleEdgeClickEvent,
  handleEdgeDoubleClickEvent,
  handleEdgeContextMenu,
} = useMouseOperation()

const pathD = computed(() => {
  const p = props.state.position
  if (props.state.loop) {
    const { radius, isLargeArc, isClockwise } = props.state.loop
    const [rx, ry] = radius
    const f1 = isLargeArc ? 1 : 0
    const f2 = isClockwise ? 1 : 0
    return `M ${p.p1.x} ${p.p1.y} A ${rx} ${ry} 0 ${f1} ${f2} ${p.p2.x} ${p.p2.y}`
  } else if (config.type === "straight" || !props.state.curve) {
    return `M ${p.p1.x} ${p.p1.y} L ${p.p2.x} ${p.p2.y}`
  } else {
    const points = [ ...props.state.curve.control, { x: p.p2.x, y: p.p2.y }]
    const d: string[] = []
    d.push(`M ${p.p1.x} ${p.p1.y}`)
    chunk(points, 2).forEach(([p1, p2]) => d.push(`Q ${p1.x} ${p1.y} ${p2.x} ${p2.y}`))
    return d.join(" ")
  }
})

const strokeWidth = computed(() => (props.state.line.stroke.width + 10) * scale.value)

</script>

<template>
  <path
    :class="{ 'v-ng-line-background': true, selectable: state.selectable }"
    :d="pathD"
    stroke="transparent"
    :stroke-width="strokeWidth"
    fill="none"
    @pointerdown.stop="handleEdgePointerDownEvent(id, $event)"
    @pointerenter.passive="handleEdgePointerOverEvent(id, $event)"
    @pointerleave.passive="handleEdgePointerOutEvent(id, $event)"
    @click.stop="handleEdgeClickEvent(id, $event)"
    @dblclick.stop="handleEdgeDoubleClickEvent(id, $event)"
    @contextmenu="handleEdgeContextMenu(id, $event)"
  />
</template>

<style lang="scss">
.v-ng-line-background {
  &.selectable {
    cursor: pointer;
  }
}
</style>
