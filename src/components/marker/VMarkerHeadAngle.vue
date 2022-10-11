<script setup lang="ts">
import { computed } from "vue"
import { MarkerUnits } from "@/common/configs"

const props = defineProps<{
  width: number
  height: number
  refX: number
  color: string
  isSource: boolean
  units: MarkerUnits
}>()

const angleStroke = computed(() => {
  return props.units === "strokeWidth" ? 1 : Math.min(props.width, props.height) / 5
})

const anglePoints = computed(() => {
  const m = angleStroke.value / 2
  const w = props.width
  const h = props.height
  if (props.isSource) {
    return `${w - m} ${h - m}, ${m} ${h / 2}, ${w - m} ${m}`
  } else {
    return `${m} ${m}, ${w - m} ${h / 2}, ${m} ${h - m}`
  }
})
</script>

<template>
  <polyline
    :points="anglePoints"
    fill="none"
    :stroke-width="angleStroke"
    :stroke="color"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
</template>
