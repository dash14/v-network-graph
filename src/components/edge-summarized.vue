<template>
  <g :class="{ selectable: config.selectable }">
    <v-line
      v-bind="pos"
      :config="config.summarized.stroke"
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
import { useStates } from "../composables/state"
import { useEdgeConfig } from "../composables/config"
import VLine from "./line.vue"
import VShape from "./shape.vue"
import VText from "./text.vue"

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
    const { edgeStates } = useStates()

    // Since the specified edges are in the same pair,
    // get the first one and draw it.
    const pos = ref({ x1: 0, y1: 0, x2: 0, y2: 0 })
    const centerPos = ref({ x: 0, y: 0 })

    watchEffect(() => {
      const edgeId = Object.keys(props.edges)[0]
      pos.value = edgeStates[edgeId].position
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
