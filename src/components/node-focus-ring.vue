<template>
  <v-shape
    class="v-node-focus-ring"
    :base-x="x"
    :base-y="y"
    :config="shapeConfig"
  />
</template>

<script lang="ts">
import { computed, defineComponent, PropType, reactive, watchEffect } from "vue"
import { Node, Position } from "../common/types"
import { CircleShapeStyle, getConfig, RectangleShapeStyle, ShapeStyle } from "../common/configs"
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

    const shape = computed<ShapeStyle>(() => {
      if (hoveredNodes.has(props.id) && config.hover) {
        return getConfig(config.hover, props.node)
      } else if (config.selected) {
        return getConfig(config.selected, props.node)
      } else {
        return getConfig(config.shape, props.node)
      }
    })

    watchEffect(() => {
      const shapeStyle = shape.value
      if (shapeStyle.type === "circle") {
        const shape: CircleShapeStyle = {
          type: "circle",
          radius:
            shapeStyle.radius +
            (shapeStyle.stroke?.width ?? 0) / 2 +
            config.focusring.padding +
            config.focusring.width / 2,
          color: "none",
          stroke: {
            width: config.focusring.width,
            color: config.focusring.color,
          },
        }
        Object.assign(shapeConfig, shape)
      } else {
        const shape: RectangleShapeStyle = {
          type: "rect",
          width:
            shapeStyle.width +
            (shapeStyle.stroke?.width ?? 0) +
            config.focusring.padding * 2 +
            config.focusring.width,
          height:
            shapeStyle.height +
            (shapeStyle.stroke?.width ?? 0) +
            config.focusring.padding * 2 +
            config.focusring.width,
          borderRadius:
            shapeStyle.borderRadius > 0 ? shapeStyle.borderRadius + config.focusring.padding : 0,
          color: "none",
          stroke: {
            width: config.focusring.width,
            color: config.focusring.color,
          },
        }
        Object.assign(shapeConfig, shape)
      }
    })

    return { x, y, shapeConfig }
  },
})
</script>

<style lang="scss" scoped>
.v-node-focus-ring {
  pointer-events: none;
}
</style>
