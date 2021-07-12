<template>
  <g :class="{ selectable: style.selectable }">
    <v-line
      :x1="pos.x1"
      :y1="pos.y1"
      :x2="pos.x2"
      :y2="pos.y2"
      :styles="style.summarized.line"
    />
    <v-shape
      :base-x="centerPos.x"
      :base-y="centerPos.y"
      :styles="style.summarized.shape"
    />
    <v-text
      :text="Object.keys(links).length.toString()"
      :x="centerPos.x"
      :y="centerPos.y"
      :styles="style.summarized.label"
      text-anchor="middle"
      dominant-baseline="central"
    />
  </g>
</template>


<script lang="ts">
import { defineComponent, PropType, ref, watchEffect } from "vue"
import { Links, NodePositions } from "@/common/types";
import { useLinkStyle } from "@/composables/style";
import VLine from "@/components/line.vue"
import VShape from "@/components/shape.vue"
import VText from "@/components/text.vue"

export default defineComponent({
  components: { VLine, VShape, VText },
  props: {
    links: {
      type: Object as PropType<Links>,
      required: true,
    },
    layouts: {
      type: Object as PropType<NodePositions>,
      required: true,
    },
  },
  setup(props) {
    const style = useLinkStyle()

    // 指定されたlinksは同一ペアのため、最初の1つを取得して描画する
    const pos = ref({ x1: 0, y1: 0, x2: 0, y2: 0 })
    const centerPos = ref({ x: 0, y: 0 })

    watchEffect(() => {
      const link = props.links[Object.keys(props.links)[0]]
      pos.value = {
        x1: props.layouts[link.source].x ?? 0,
        y1: props.layouts[link.source].y ?? 0,
        x2: props.layouts[link.target].x ?? 0,
        y2: props.layouts[link.target].y ?? 0
      }
      centerPos.value = {
        x: (pos.value.x1 + pos.value.x2) / 2,
        y: (pos.value.y1 + pos.value.y2) / 2
      }
    })

    return { style, pos, centerPos }
  }
})

</script>

<style lang="scss" scoped>
.selectable {
  cursor: pointer;
}
</style>
