<script setup lang="ts">
import { StrokeStyle } from "@/common/configs"
import { Position } from "@/common/types"
import { useStrokeAttributes } from "@/composables/stroke"
import { Arc } from "@/models/edge"
import { edgePathOf } from "@/modules/edge/geometry"

const props = defineProps<{
  p1: Position
  p2: Position
  /** Drawn as this arc between the ends, rather than straight. */
  loop?: Arc
  config: StrokeStyle
  markerStart?: string
  markerEnd?: string
}>()

const { strokeWidth, strokeDasharray, animationSpeed } = useStrokeAttributes(() => props.config)
</script>

<template>
  <path
    :class="{ 'v-ng-line': true, animate: config.animate }"
    :d="edgePathOf({ position: { p1, p2 }, loop })"
    :fill="loop ? 'none' : undefined"
    :stroke="config.color"
    :stroke-width="strokeWidth"
    :stroke-dasharray="strokeDasharray"
    :stroke-linecap="config.linecap"
    :style="animationSpeed"
    :marker-start="markerStart ? `url('#${markerStart}')` : undefined"
    :marker-end="markerEnd ? `url('#${markerEnd}')` : undefined"
  />
</template>
