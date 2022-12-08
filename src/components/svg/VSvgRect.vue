<script setup lang="ts">
import { RectangleShapeStyle } from "@/common/configs"
import { applyScaleToDasharray } from "@/utils/visual"

interface Props {
  x: number
  y: number
  width: number
  height: number
  config: RectangleShapeStyle
  scale?: number
}

withDefaults(defineProps<Props>(), {
  scale: 1.0,
})
</script>

<template>
  <rect
    class="v-ng-svg-rect"
    :x="x"
    :y="y"
    :width="width * scale"
    :height="height * scale"
    :rx="config.borderRadius * scale"
    :ry="config.borderRadius * scale"
    :fill="config.color"
    :stroke="config.strokeColor"
    :stroke-width="config.strokeWidth * scale"
    :stroke-dasharray="applyScaleToDasharray(config.strokeDasharray, scale)"
  />
</template>
