<template>
  <nt-line
    :class="{ selectable: style.selectable }"
    :x1="x1"
    :y1="y1"
    :x2="x2"
    :y2="y2"
    :styles="selected ? style.selected : style.stroke"
    @mousedown.prevent.stop="handleLinkMouseDownEvent(id, $event)"
  />
</template>

<script lang="ts">
import { defineComponent, PropType, ref, watchEffect } from "vue"
import { useZoomLevel } from "@/composables/zoom"
import { useLinkStyle } from "@/composables/style"
import { Node, Position } from "@/common/types"
import NtLine from "@/objects/line.vue"
import { useMouseOperation } from "@/composables/mouse"

function calculateLinePosition(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  index: number,
  count: number,
  zoom: number,
  width: number,
  gap: number
) {
  const dx = x2 - x1
  const dy = y2 - y1

  // 中央からずれたところを開始位置とするためのずらし幅
  const interval = width + gap
  const allWidth = interval * (count - 1)
  const diff = (interval * index - allWidth / 2) / zoom

  if (dx === 0) {
    return [x1 + diff, y1, x2 + diff, y2]
  } else if (dy === 0) {
    return [x1, y1 + diff, x2, y2 + diff]
  } else {
    const slope = dy / dx
    const moveSlope = -1 / slope
    const diffX = diff / Math.sqrt(1 + Math.pow(moveSlope, 2))
    return [x1 + diffX, y1 + diffX * moveSlope, x2 + diffX, y2 + diffX * moveSlope]
  }
}

export default defineComponent({
  components: { NtLine },
  props: {
    id: {
      type: String,
      required: true,
    },
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
      default: undefined,
    },
    targetPos: {
      type: Object as PropType<Position>,
      required: false,
      default: undefined,
    },
    i: {
      type: Number,
      default: 0,
    },
    count: {
      type: Number,
      default: 1,
    },
    selected: {
      type: Boolean,
      default: false,
    },
  },
  setup(props) {
    const style = useLinkStyle()
    const { scale } = useZoomLevel()
    const { handleLinkMouseDownEvent } = useMouseOperation()

    const x1 = ref(0)
    const y1 = ref(0)
    const x2 = ref(0)
    const y2 = ref(0)

    watchEffect(() => {
      if (props.sourceId < props.targetId) {
        [x1.value, y1.value, x2.value, y2.value] = calculateLinePosition(
          props.sourcePos?.x ?? 0,
          props.sourcePos?.y ?? 0,
          props.targetPos?.x ?? 0,
          props.targetPos?.y ?? 0,
          props.i,
          props.count,
          scale.value,
          style.stroke.width,
          style.gap
        )
      } else {
        [x2.value, y2.value, x1.value, y1.value] = calculateLinePosition(
          props.targetPos?.x ?? 0,
          props.targetPos?.y ?? 0,
          props.sourcePos?.x ?? 0,
          props.sourcePos?.y ?? 0,
          props.i,
          props.count,
          scale.value,
          style.stroke.width,
          style.gap
        )
      }
    })

    return { handleLinkMouseDownEvent, x1, y1, x2, y2, style }
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
}
</style>
