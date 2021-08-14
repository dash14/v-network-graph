<template>
  <v-shape
    class="v-node-focus-ring"
    :base-x="x"
    :base-y="y"
    :config="shapeConfig"
  />
</template>

<script lang="ts">
import { computed, defineComponent, PropType, reactive, ref, watchEffect } from "vue"
import { Node, Position } from "../common/types"
import { CircleShapeStyle, Config, RectangleShapeStyle, ShapeStyle } from "../common/configs"
import { useNodeConfig } from "../composables/style"
import { useMouseOperation } from "../composables/mouse"
import VShape from "./shape.vue"

export default defineComponent({
  components: { VShape },
  props: {
    id: {
      type: String,
      required: true,
    },
    node: {
      type: Object as PropType<Node>,
      required: true,
    },
    pos: {
      type: Object as PropType<Position>,
      required: false,
      default: undefined,
    },
  },
  setup(props) {
    const x = computed(() => props.pos?.x || 0)
    const y = computed(() => props.pos?.y || 0)

    const config = useNodeConfig()
    const shapeConfig = reactive<ShapeStyle>({} as any)

    const { hoveredNodes } = useMouseOperation()

    // for suppress reactive events
    const isHovered = ref(false)
    watchEffect(() => {
      const hovered = hoveredNodes.has(props.id)
      if (isHovered.value != hovered) {
        isHovered.value = hovered
      }
    })

    const shape = computed<ShapeStyle>(() => {
      if (isHovered.value && config.hover) {
        return Config.values(config.hover, props.node)
      } else if (config.selected) {
        return Config.values(config.selected, props.node)
      } else {
        return Config.values(config.normal, props.node)
      }
    })

    watchEffect(() => {
      const shapeStyle = shape.value
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

    return { x, y, shapeConfig }
  },
})
</script>

<style lang="scss" scoped>
$transition: 0.1s linear;

.v-node-focus-ring {
  pointer-events: none;
}

.v-shape-circle {
  transition: r $transition;
}
.v-shape-rect {
  transition: x $transition, y $transition, width $transition, height $transition;
}
.dragging .v-shape-circle,
.dragging .v-shape-rect {
  transition: none;
}
</style>
