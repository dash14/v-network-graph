<script setup lang="ts">
import { PropType } from "vue"
import { MarkerUnits } from "../common/configs"

const props = defineProps({
  width: {
    type: Number,
    required: true,
  },
  height: {
    type: Number,
    required: true,
  },
  refX: {
    type: Number,
    required: true,
  },
  color: {
    type: String,
    required: true,
  },
  isSource: {
    type: Boolean,
    required: true,
  },
  units: {
    type: String as PropType<MarkerUnits>,
    required: true,
  }
})
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
