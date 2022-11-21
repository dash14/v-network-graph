<script setup lang="ts">
import { computed, reactive, watchEffect } from "vue"
import { Position } from "@/common/types"
import { CircleShapeStyle, RectangleShapeStyle, ShapeStyle } from "@/common/configs"
import { NodeState } from "@/models/node"
import { useNodeConfig } from "@/composables/config"
import VShape from "@/components/base/VShape.vue"

interface Props {
  id: string
  state: NodeState
  pos: Position
}

const props = withDefaults(defineProps<Props>(), {
  pos: undefined,
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

</script>

<template>
  <v-shape
    class="v-ng-node-focus-ring"
    :base-x="x"
    :base-y="y"
    :config="shapeConfig"
  />
</template>

<style lang="scss">
$transition: 0.1s linear;

.v-ng-node-focus-ring {
  pointer-events: none;
}

:where(.v-ng-shape-circle) {
  transition: r $transition;
}
:where(.v-ng-shape-rect) {
  transition: x $transition, y $transition, width $transition, height $transition;
}
:where(.dragging .v-ng-shape-circle),
:where(.dragging .v-ng-shape-rect) {
  transition: none;
}
</style>
