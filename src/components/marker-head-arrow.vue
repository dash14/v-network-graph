<script setup lang="ts">
  import { computed, PropType } from "vue"
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
