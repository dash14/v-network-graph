<script setup lang="ts">
import { CircleShapeStyle } from "@/common/configs"
import { applyScaleToDasharray } from "@/utils/visual";

interface Props {
  x: number
  y: number
  radius: number
  config: CircleShapeStyle
  scale?: number
}

withDefaults(defineProps<Props>(), {
  scale: 1.0
})

</script>

<template>
  <circle
    class="v-ng-svg-circle"
    :cx="x"
    :cy="y"
    :r="radius * scale"
    :fill="config.color"
    :stroke="config.strokeColor"
    :stroke-width="config.strokeWidth * scale"
    :stroke-dasharray="applyScaleToDasharray(config.strokeDasharray, scale)"
  />
</template>
