<script setup lang="ts">
import { computed, PropType, ref, watchEffect } from "vue"
import { Edges, NodePositions } from "../common/types"
import { Config } from "../common/configs"
import { useStates } from "../composables/state"
import { useEdgeConfig } from "../composables/config"
import VLine from "./line.vue"
import VShape from "./shape.vue"
import VText from "./label-text.vue"

const props = defineProps({
  edges: {
    type: Object as PropType<Edges>,
    required: true,
  },
  layouts: {
    type: Object as PropType<NodePositions>,
    required: true,
  },
})

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

const labelConfig = computed(() => Config.values(config.summarized.label, props.edges))
const shapeConfig = computed(() => Config.values(config.summarized.shape, props.edges))
const strokeConfig = computed(() => Config.values(config.summarized.stroke, props.edges))

defineExpose({ config, pos, centerPos })
</script>

<template>
  <g>
    <v-line v-bind="pos" :config="strokeConfig" />
    <v-shape :base-x="centerPos.x" :base-y="centerPos.y" :config="shapeConfig" />
    <v-text
      :text="Object.keys(edges).length.toString()"
      :x="centerPos.x"
      :y="centerPos.y"
      :config="labelConfig"
      text-anchor="middle"
      dominant-baseline="central"
    />
  </g>
</template>
