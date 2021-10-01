<script setup lang="ts">
import { computed, PropType, reactive, watchEffect } from "vue"
import { Position } from "../common/types"
import { NodeState } from "../composables/state"
import { CircleShapeStyle, RectangleShapeStyle, ShapeStyle } from "../common/configs"
import { useNodeConfig } from "../composables/config"
import VShape from "./shape.vue"

const props = defineProps({
  id: {
    type: String,
    required: true,
  },
  state: {
    type: Object as PropType<NodeState>,
    required: true,
  },
  pos: {
    type: Object as PropType<Position>,
    required: false,
    default: undefined,
  },
})

const x = computed(() => props.pos?.x || 0)
const y = computed(() => props.pos?.y || 0)

const config = useNodeConfig()
const shapeConfig = reactive<ShapeStyle>({} as any)

watchEffect(() => {
  const shapeStyle = props.state.shape
  if (shapeStyle.type === "circle") {
    const shape: CircleShapeStyle = {
      type: "circle",
      radius:
        shapeStyle.radius +
        (shapeStyle.strokeWidth ?? 0) / 2 +
        config.focusring.padding +
        config.focusring.width / 2,
      color: "none",
      strokeWidth: config.focusring.width,
      strokeColor: config.focusring.color,
      strokeDasharray: config.focusring.dasharray,
    }
    Object.assign(shapeConfig, shape)
  } else {
    const shape: RectangleShapeStyle = {
      type: "rect",
      width:
        shapeStyle.width +
        (shapeStyle.strokeWidth ?? 0) +
        config.focusring.padding * 2 +
        config.focusring.width,
      height:
        shapeStyle.height +
        (shapeStyle.strokeWidth ?? 0) +
        config.focusring.padding * 2 +
        config.focusring.width,
      borderRadius:
        shapeStyle.borderRadius > 0 ? shapeStyle.borderRadius + config.focusring.padding : 0,
      color: "none",
      strokeWidth: config.focusring.width,
      strokeColor: config.focusring.color,
      strokeDasharray: config.focusring.dasharray,
    }
    Object.assign(shapeConfig, shape)
  }
})

defineExpose({ x, y, shapeConfig })
</script>

<template>
  <v-shape
    class="v-node-focus-ring"
    :base-x="x"
    :base-y="y"
    :config="shapeConfig"
  />
</template>

<style lang="scss" scoped>
$transition: 0.1s linear;

.v-node-focus-ring {
  pointer-events: none;
}

:where(.v-shape-circle) {
  transition: r $transition;
}
:where(.v-shape-rect) {
  transition: x $transition, y $transition, width $transition, height $transition;
}
:where(.dragging .v-shape-circleg),
:where(.dragging .v-shape-rect) {
  transition: none;
}
</style>
