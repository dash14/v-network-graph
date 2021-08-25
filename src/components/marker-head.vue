<script setup lang="ts">
import { HeadMarker } from "../composables/marker"
import { computed, PropType } from "vue"

const props = defineProps({
  id: {
    type: String,
    required: true,
  },
  marker: {
    type: Object as PropType<HeadMarker>,
    required: true,
  },
  scale: {
    type: Number,
    required: true,
  },
})

const width = computed(
  () => props.marker.width * (props.marker.units === "strokeWidth" ? 1 : props.scale)
)
const height = computed(
  () => props.marker.height * (props.marker.units === "strokeWidth" ? 1 : props.scale)
)

const refX = computed(() => {
  const margin = props.marker.margin * (props.marker.units === "strokeWidth" ? 1 : props.scale)
  return props.marker.isSource ? width.value + margin : -margin
})

const arrowPoints = computed(() => {
  const w = width.value
  const h = height.value
  if (props.marker.isSource) {
    return `${w} ${h}, 0 ${h / 2}, ${w} 0`
  } else {
    return `0 0, ${w} ${h / 2}, 0 ${h}`
  }
})

const angleStroke = computed(() => {
  return props.marker.units === "strokeWidth" ? 1 : Math.min(width.value, height.value) / 5
})
const anglePoints = computed(() => {
  const m = angleStroke.value / 2
  const w = width.value
  const h = height.value
  if (props.marker.isSource) {
    return `${w - m} ${h - m}, ${m} ${h / 2}, ${w - m} ${m}`
  } else {
    return `${m} ${m}, ${w - m} ${h / 2}, ${m} ${h - m}`
  }
})
</script>

<template>
  <marker
    v-if="marker.type !== 'custom'"
    :id="id"
    :markerWidth="width"
    :markerHeight="height"
    :refX="refX"
    :refY="height / 2"
    orient="auto"
    :markerUnits="marker.units"
    class="v-marker"
  >
    <polygon v-if="marker.type === 'arrow'" :points="arrowPoints" :fill="marker.color" />
    <polyline
      v-else-if="marker.type === 'angle'"
      :points="anglePoints"
      fill="none"
      :stroke-width="angleStroke"
      :stroke="marker.color"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <ellipse
      v-else-if="marker.type === 'circle'"
      :fill="marker.color"
      :cx="width / 2"
      :cy="height / 2"
      :rx="width / 2"
      :ry="height / 2"
    />
  </marker>
</template>
