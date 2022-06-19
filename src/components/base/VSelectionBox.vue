<script setup lang="ts">
import { PropType } from "vue"
import { Rectangle } from "@/common/types"
import { BasicShapeStyle } from "@/common/configs"

defineProps({
  box: {
    type: Object as PropType<Rectangle>,
    required: true
  },
  config: {
    type: Object as PropType<BasicShapeStyle>,
    required: true
  }
})
</script>

<template>
  <rect
    class="selection-box"
    :x="Math.round(box.pos.x)"
    :y="Math.round(box.pos.y)"
    :width="Math.round(box.size.width)"
    :height="Math.round(box.size.height)"
    :fill="config.color"
    :stroke="config.strokeColor"
    :stroke-width="config.strokeWidth"
    :stroke-dasharray="config.strokeDasharray"
  />
</template>

<style scoped>
.selection-box {
  shape-rendering: crispEdges;
}
</style>
