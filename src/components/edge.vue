<template>
  <v-line
    v-bind="state.position"
    :class="{ selectable: config.selectable }"
    :config="state.stroke"
    @pointerdown.prevent.stop="handleEdgePointerDownEvent(id, $event)"
    @pointerenter="handleEdgePointerOverEvent(id, $event)"
    @pointerleave="handleEdgePointerOutEvent(id, $event)"
  />
</template>

<script lang="ts">
import { defineComponent, PropType, ref, watchEffect } from "vue"
import { useEdgeConfig } from "../composables/style"
import { Position } from "../common/types"
import { EdgeState } from "../composables/state"
import { useMouseOperation } from "../composables/mouse"
import VLine from "./line.vue"

export default defineComponent({
  components: { VLine },
  props: {
    id: {
      type: String,
      required: true,
    },
    state: {
      type: Object as PropType<EdgeState>,
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
  },
  setup(props) {
    const config = useEdgeConfig()
    const {
      handleEdgePointerDownEvent,
      handleEdgePointerOverEvent,
      handleEdgePointerOutEvent,
      hoveredEdges,
    } = useMouseOperation()

    // for suppress reactive events
    const isHovered = ref(false)
    watchEffect(() => {
      const hovered = hoveredEdges.has(props.id)
      if (isHovered.value != hovered) {
        isHovered.value = hovered
      }
    })

    return {
      config,
      handleEdgePointerDownEvent,
      handleEdgePointerOverEvent,
      handleEdgePointerOutEvent,
    }
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
