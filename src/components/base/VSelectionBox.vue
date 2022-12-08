<script setup lang="ts">
import { Rectangle } from "@/common/types"
import { BasicShapeStyle } from "@/common/configs"

defineProps<{
  box: Rectangle
  config: BasicShapeStyle
}>()
</script>

<template>
  <rect
    class="v-ng-selection-box"
    :x="Math.round(box.pos.x)"
    :y="Math.round(box.pos.y)"
    :width="Math.ceil(box.size.width)"
    :height="Math.ceil(box.size.height)"
    :fill="config.color"
    :stroke="config.strokeColor"
    :stroke-width="config.strokeWidth"
    :stroke-dasharray="config.strokeDasharray"
  />
</template>

<style lang="scss">
.v-ng-selection-box {
  shape-rendering: crispEdges;
}
</style>
