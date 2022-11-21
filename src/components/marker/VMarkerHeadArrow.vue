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

const arrowPoints = computed(() => {
  const w = props.width
  const h = props.height
  if (props.isSource) {
    return `${w} ${h}, 0 ${h / 2}, ${w} 0`
  } else {
    return `0 0, ${w} ${h / 2}, 0 ${h}`
  }
})

</script>

<template>
  <polygon :points="arrowPoints" :fill="color" />
</template>
