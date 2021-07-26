<template>
  <v-line
    :class="{ selectable: config.selectable }"
    :x1="x1"
    :y1="y1"
    :x2="x2"
    :y2="y2"
    :config="stroke"
    @pointerdown.prevent.stop="handleEdgePointerDownEvent(id, $event)"
    @pointerover="hover = true"
    @pointerout="hover = false"
  />
</template>

<script lang="ts">
import { computed, defineComponent, PropType, ref, watchEffect } from "vue"
import { useZoomLevel } from "../composables/zoom"
import { useEdgeConfig } from "../composables/style"
import { StrokeStyle } from "../common/configs"
import { Node, Position } from "../common/types"
import { useMouseOperation } from "../composables/mouse"
import VLine from "../components/line.vue"

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
  components: { VLine },
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
    const hover = ref(false)
    const config = useEdgeConfig()
    const { scale } = useZoomLevel()
    const { handleEdgePointerDownEvent } = useMouseOperation()

    const stroke = computed<StrokeStyle>(() => {
      if (props.selected) {
        return config.selected
      } else if (hover.value && config.hover) {
        return config.hover
      } else {
        return config.stroke
      }
    })

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
          config.stroke.width,
          config.gap
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
          config.stroke.width,
          config.gap
        )
      }
    })

    return { hover, config, stroke, handleEdgePointerDownEvent, x1, y1, x2, y2 }
  },
})
</script>

<style lang="scss" scoped>
$transition: 0.1s linear;

path {
  transition: stroke $transition, stroke-width $transition;
}
path.selectable {
  cursor: pointer;
}
</style>
