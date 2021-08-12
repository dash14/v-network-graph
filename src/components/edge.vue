<template>
  <v-line
    v-bind="edgePositions(id, sourcePos, targetPos)"
    :class="{ selectable: config.selectable }"
    :config="stroke"
    @pointerdown.prevent.stop="handleEdgePointerDownEvent(id, $event)"
    @pointerover="hover = true"
    @pointerout="hover = false"
  />
</template>

<script lang="ts">
import { computed, defineComponent, PropType, ref } from "vue"
import { useEdgeConfig } from "../composables/style"
import { Config, StrokeStyle } from "../common/configs"
import { Edge, Position } from "../common/types"
import { useEdgePositions } from "../composables/edge"
import { useMouseOperation } from "../composables/mouse"
import VLine from "./line.vue"

export default defineComponent({
  components: { VLine },
  props: {
    id: {
      type: String,
      required: true,
    },
    edge: {
      type: Object as PropType<Edge>,
      required: true,
    },
    sourcePos: {
      type: Object as PropType<Position>,
      required: false,
      default: undefined,
    },
    targetPos: {
      type: Object as PropType<Position>,
      required: false,
      default: undefined,
    },
    selected: {
      type: Boolean,
      default: false,
    },
  },
  setup(props) {
    const hover = ref(false)
    const config = useEdgeConfig()
    const { edgePositions } = useEdgePositions()
    const { handleEdgePointerDownEvent } = useMouseOperation()

    const stroke = computed<StrokeStyle>(() => {
      if (props.selected) {
        return Config.values(config.selected, props.edge)
      } else if (hover.value && config.hover) {
        return Config.values(config.hover, props.edge)
      } else {
        return Config.values(config.normal, props.edge)
      }
    })

    return { edgePositions, hover, config, stroke, handleEdgePointerDownEvent }
  },
})
</script>

<style lang="scss" scoped>
$transition: 0.1s linear;

.v-line {
  transition: stroke $transition, stroke-width $transition;
}

.v-line.selectable {
  cursor: pointer;
}
</style>
