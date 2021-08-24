<script setup lang="ts">
import { HeadMarker } from "../composables/marker"
import { computed, PropType } from "vue"

const props = defineProps({
  id: {
    type: String,
    required: true
  },
  marker: {
    type: Object as PropType<HeadMarker>,
    required: true
  },
  scale: {
    type: Number,
    required: true
  }
})

const width = computed(() => props.marker.width * (props.marker.relative ? 1 : props.scale))
const height = computed(() => props.marker.height * (props.marker.relative ? 1 : props.scale))
const points = computed(() => {
  const w = width.value
  const h = height.value
  if (props.marker.isSource) {
    return `${w} 0, ${w} ${h}, 0 ${h / 2}`
  } else {
    return `0 0, ${w} ${h / 2}, 0 ${h}`
  }
})
</script>

<template>
  <marker
    :id="id"
    :markerWidth="width"
    :markerHeight="height"
    :refX="props.marker.isSource ? width : 0"
    :refY="height / 2"
    orient="auto"
    :markerUnits="props.marker.relative ? 'strokeWidth' : 'userSpaceOnUse'"
    class="v-marker"
  >
    <polygon :points="points" :fill="marker.color" />
  </marker>
</template>
