<template>
  <path
    :class="{ selectable: style.selectable }"
    :d="`M ${x1} ${y1} L ${x2} ${y2}`"
    :stroke="style.color"
    :stroke-width="strokeWidth"
    :stroke-dasharray="strokeDasharray"
  />
</template>

<script lang="ts">
import { computed, defineComponent, PropType, ref, watchEffect } from "vue"
import { useLinkStyle, useNodeStyle } from "../composables/style"
import { Node, Position } from "../common/types"

export default defineComponent({
  props: {
    sourceId: {
      type: String,
      required: true,
    },
    targetId: {
      type: String,
      required: true,
    },
    sourceNode: {
      type: Object as PropType<Node>,
      required: true,
    },
    targetNode: {
      type: Object as PropType<Node>,
      required: true,
    },
    sourcePos: {
      type: Object as PropType<Position>,
      required: false,
      default: undefined
    },
    targetPos: {
      type: Object as PropType<Position>,
      required: false,
      default: undefined
    },
    i: {
      type: Number,
      default: 0,
    },
    count: {
      type: Number,
      default: 1,
    },
    zoom: {
      type: Number,
      required: true,
    },
  },
  setup(props) {
    const style = useLinkStyle()
    const nodeStyle = useNodeStyle()

    const x1 = ref(0)
    const y1 = ref(0)
    const x2 = ref(0)
    const y2 = ref(0)

    watchEffect(() => {
      const z = nodeStyle.resizeWithZooming ? 1 : props.zoom
      let nx1, nx2, ny1, ny2
      if (props.sourceId < props.targetId) {
        nx1 = props.sourcePos?.x ?? 0
        ny1 = props.sourcePos?.y ?? 0
        nx2 = props.targetPos?.x ?? 0
        ny2 = props.targetPos?.y ?? 0
      } else {
        nx1 = props.targetPos?.x ?? 0
        ny1 = props.targetPos?.y ?? 0
        nx2 = props.sourcePos?.x ?? 0
        ny2 = props.sourcePos?.y ?? 0
      }

      const dx = nx2 - nx1
      const dy = ny2 - ny1
      const slope = dx === 0 ? 1 : dy / dx

      // 中央からずれたところを開始位置とするためのずらし幅
      const allWidth = style.gap * (props.count - 1)
      const diff = style.gap * props.i - allWidth / 2

      if (slope === 0) {
        const diffY = diff / z
        x1.value = nx1
        y1.value = ny1 + diffY
        x2.value = nx2
        y2.value = ny2 + diffY
      } else {
        const moveSlope = -1 / slope
        const diffX = diff / Math.sqrt(1 + Math.pow(moveSlope, 2)) / z
        x1.value = nx1 + diffX
        y1.value = ny1 + diffX * moveSlope
        x2.value = nx2 + diffX
        y2.value = ny2 + diffX * moveSlope
      }
    })

    const strokeWidth = computed(() => {
      const z = nodeStyle.resizeWithZooming ? 1 : props.zoom
      return style.width / z
    })
    const strokeDasharray = computed(() => {
      const z = nodeStyle.resizeWithZooming ? 1 : props.zoom
      if (z === 1) {
        return style.strokeDasharray
      } else {
        return style.strokeDasharray
          .split(/\s+/)
          .map(v => parseInt(v) / z)
          .join(" ")
      }
    })

    return { x1, y1, x2, y2, style, strokeWidth, strokeDasharray }
  },
})
</script>

<style lang="scss" scoped>
path {
  pointer-events: none;
}
path.selectable {
  pointer-events: all;
  cursor: pointer;
}</style
>>
