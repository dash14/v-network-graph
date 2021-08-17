<script setup lang="ts">
import { PropType, ref, watchEffect } from "vue"
import { AnyShapeStyle } from "../common/configs"
import { useZoomLevel } from "../composables/zoom"
import { applyScaleToDasharray } from "../common/utility"

const props = defineProps({
  baseX: {
    type: Number,
    default: 0,
  },
  baseY: {
    type: Number,
    default: 0,
  },
  config: {
    type: Object as PropType<AnyShapeStyle>,
    required: true,
  },
})

const { scale } = useZoomLevel()

const x = ref(props.baseX)
const y = ref(props.baseY)
const strokeWidth = ref(0)
const strokeColor = ref("#000000")
const strokeDasharray = ref<string | number | undefined>(undefined)
const radius = ref(0)
const width = ref(0)
const height = ref(0)
const borderRadius = ref(0)

watchEffect(() => {
  const s = scale.value
  strokeWidth.value = props.config.strokeWidth * s
  strokeColor.value = props.config.strokeColor ?? "none"
  strokeDasharray.value = applyScaleToDasharray(props.config.strokeDasharray, s)

  if (props.config.type === "circle") {
    x.value = props.baseX
    y.value = props.baseY
    radius.value = props.config.radius * s
  } else {
    width.value = props.config.width * s
    height.value = props.config.height * s
    borderRadius.value = props.config.borderRadius * s
    x.value = props.baseX - width.value / 2
    y.value = props.baseY - height.value / 2
  }
})

defineExpose({
  x,
  y,
  strokeWidth,
  strokeColor,
  strokeDasharray,
  radius,
  width,
  height,
  borderRadius,
})
</script>

<template>
  <circle
    v-if="config.type === 'circle'"
    class="v-shape-circle"
    :cx="x"
    :cy="y"
    :r="radius"
    :fill="config.color"
    :stroke="strokeColor"
    :stroke-width="strokeWidth"
    :stroke-dasharray="strokeDasharray"
  />
  <rect
    v-else
    class="v-shape-rect"
    :x="x"
    :y="y"
    :width="width"
    :height="height"
    :rx="borderRadius"
    :ry="borderRadius"
    :fill="config.color"
    :stroke="strokeColor"
    :stroke-width="strokeWidth"
    :stroke-dasharray="strokeDasharray"
  />
</template>
