<template>
  <text
    class="v-text"
    :font-family="config.fontFamily"
    :font-size="fontSize"
    :x="x"
    :y="y"
    :fill="config.color"
  >{{ text }}</text>
</template>

<script lang="ts">
import { computed, defineComponent, PropType } from "vue"
import { LabelStyle } from "../common/configs"
import { useZoomLevel } from "../composables/zoom"

export default defineComponent({
  props: {
    text: {
      type: String,
      required: true
    },
    x: {
      type: Number,
      required: true
    },
    y: {
      type: Number,
      required: true
    },
    config: {
      type: Object as PropType<LabelStyle>,
      required: true,
    },
  },
  setup(props) {
    const { scale } = useZoomLevel()

    const fontSize = computed(() => {
      return props.config.fontSize / scale.value
    })

    return {
      fontSize
    }
  },
})
</script>
