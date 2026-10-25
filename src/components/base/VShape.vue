<script setup lang="ts">
import { AnyShapeStyle } from "@/common/configs"
import { useShapeAttributes } from "@/composables/shape"

interface Props {
  baseX?: number
  baseY?: number
  config: AnyShapeStyle
}

const props = withDefaults(defineProps<Props>(), {
  baseX: 0,
  baseY: 0,
})

const { x, y, strokeWidth, strokeColor, strokeDasharray, radius, width, height, borderRadius } =
  useShapeAttributes(props)
</script>

<template>
  <circle
    v-if="config.type === 'circle'"
    class="v-ng-shape-circle"
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
    class="v-ng-shape-rect"
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
