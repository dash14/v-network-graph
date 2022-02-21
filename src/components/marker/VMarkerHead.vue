<script setup lang="ts">
import { computed, PropType } from "vue"
import { EdgeHeadType } from "@/common/configs"
import { HeadMarker } from "@/composables/marker"
import VMarkerHeadArrow from "./VMarkerHeadArrow.vue"
import VMarkerHeadAngle from "./VMarkerHeadAngle.vue"
import VMarkerHeadCircle from "./VMarkerHeadCircle.vue"

type MarkerType = Exclude<EdgeHeadType, "none" | "custom">

const types: Record<MarkerType, any> = {
  arrow: VMarkerHeadArrow,
  angle: VMarkerHeadAngle,
  circle: VMarkerHeadCircle
}

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

</script>

<template>
  <marker
    v-if="marker.type !== 'none' && marker.type !== 'custom'"
    :id="id"
    :markerWidth="width"
    :markerHeight="height"
    :refX="refX"
    :refY="height / 2"
    orient="auto"
    :markerUnits="marker.units"
    class="v-marker"
  >
    <component
      :is="types[marker.type]"
      :width="width"
      :height="height"
      :refX="refX"
      :color="marker.color"
      :is-source="marker.isSource"
      :units="marker.units"
    />
  </marker>
</template>
