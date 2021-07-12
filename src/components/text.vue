<template>
  <text
    :font-family="styles.fontFamily"
    :font-size="fontSize"
    :x="x"
    :y="y"
    :fill="styles.color"
  >{{ text }}</text>
</template>

<script lang="ts">
import { computed, defineComponent, PropType } from "vue"
import { LabelStyle } from "@/common/styles"
import { useZoomLevel } from "@/composables/zoom"

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
    styles: {
      type: Object as PropType<LabelStyle>,
      required: true,
    },
  },
  setup(props) {
    const { scale } = useZoomLevel()

    const fontSize = computed(() => {
      return props.styles.fontSize / scale.value
    })

    return {
      fontSize
    }
  },
})
</script>
