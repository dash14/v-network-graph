<script setup lang="ts">
import { MarkerUnits } from "@/common/configs"

defineProps<{
  width: number
  height: number
  refX: number
  color: string
  isSource: boolean
  units: MarkerUnits
}>()
</script>

<template>
  <ellipse
    :fill="color"
    :cx="width / 2"
    :cy="height / 2"
    :rx="width / 2"
    :ry="height / 2"
  />
</template>
