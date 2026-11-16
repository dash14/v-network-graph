<script setup lang="ts">
import { StrokeStyle } from "@/common/configs"
import { Position } from "@/common/types"
import { useStrokeAttributes } from "@/composables/stroke"

const props = defineProps<{
  p1: Position
  p2: Position
  config: StrokeStyle
  markerStart?: string
  markerEnd?: string
}>()

const { strokeWidth, strokeDasharray, animationSpeed } = useStrokeAttributes(() => props.config)
</script>

<template>
  <path
    :class="{ 'v-ng-line': true, animate: config.animate }"
    :d="`M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`"
    :stroke="config.color"
    :stroke-width="strokeWidth"
    :stroke-dasharray="strokeDasharray"
    :stroke-linecap="config.linecap"
    :style="animationSpeed"
    :marker-start="markerStart ? `url('#${markerStart}')` : undefined"
    :marker-end="markerEnd ? `url('#${markerEnd}')` : undefined"
  />
</template>
