<template>
  <g :class="{ selectable: config.selectable }">
    <v-line
      :x1="pos.x1"
      :y1="pos.y1"
      :x2="pos.x2"
      :y2="pos.y2"
      :config="config.summarized.line"
    />
    <v-shape :base-x="centerPos.x" :base-y="centerPos.y" :config="config.summarized.shape" />
    <v-text
      :text="Object.keys(edges).length.toString()"
      :x="centerPos.x"
      :y="centerPos.y"
      :config="config.summarized.label"
      text-anchor="middle"
      dominant-baseline="central"
    />
  </g>
</template>

<script lang="ts">
import { defineComponent, PropType, ref, watchEffect } from "vue"
import { Edges, NodePositions } from "../common/types"
import { useEdgeConfig } from "../composables/style"
import VLine from "../components/line.vue"
import VShape from "../components/shape.vue"
import VText from "../components/text.vue"

export default defineComponent({
  components: { VLine, VShape, VText },
  props: {
    edges: {
      type: Object as PropType<Edges>,
      required: true,
    },
    layouts: {
      type: Object as PropType<NodePositions>,
      required: true,
    },
  },
  setup(props) {
    const config = useEdgeConfig()

    // 指定されたedgesは同一ペアのため、最初の1つを取得して描画する
    const pos = ref({ x1: 0, y1: 0, x2: 0, y2: 0 })
    const centerPos = ref({ x: 0, y: 0 })

    watchEffect(() => {
      const edge = props.edges[Object.keys(props.edges)[0]]
      pos.value = {
        x1: props.layouts[edge.source].x ?? 0,
        y1: props.layouts[edge.source].y ?? 0,
        x2: props.layouts[edge.target].x ?? 0,
        y2: props.layouts[edge.target].y ?? 0,
      }
      centerPos.value = {
        x: (pos.value.x1 + pos.value.x2) / 2,
        y: (pos.value.y1 + pos.value.y2) / 2,
      }
    })

    return { config, pos, centerPos }
  },
})
</script>

<style lang="scss" scoped>
.selectable {
  cursor: pointer;
}
</style>
