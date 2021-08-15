<template>
  <g>
    <circle
      :cx="labelArea.source.above.x"
      :cy="labelArea.source.above.y"
      r="3"
      fill="red"
    />
    <circle
      :cx="labelArea.target.above.x"
      :cy="labelArea.target.above.y"
      r="3"
      fill="green"
    />
    <circle
      :cx="labelArea.source.below.x"
      :cy="labelArea.source.below.y"
      r="3"
      fill="blue"
    />
    <circle
      :cx="labelArea.target.below.x"
      :cy="labelArea.target.below.y"
      r="3"
      fill="orange"
    />
  </g>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue"
import { EdgeLabelArea } from "../common/types"

export default defineComponent({
  props: {
    labelArea: {
      type: Object as PropType<EdgeLabelArea>,
      required: true,
    },
  },
  setup(props) {
    return {}
  },
})
</script>
