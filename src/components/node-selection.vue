<template>
  <v-shape
    class="v-node-selection"
    :base-x="x"
    :base-y="y"
    :config="shapeConfig"
  />
</template>

<script lang="ts">
import { computed, defineComponent, PropType, reactive, watchEffect } from "vue"
import { Position } from "../common/types"
import { CircleShapeStyle, RectangleShapeStyle, ShapeStyle } from "../common/configs"
import { useNodeConfig } from "../composables/style"
import VShape from "../components/shape.vue"

export default defineComponent({
  components: { VShape },
  props: {
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

    watchEffect(() => {
      const shapeStyle = config.shape
      if (shapeStyle.type === "circle") {
        const shape: CircleShapeStyle = {
          type: "circle",
          radius:
            shapeStyle.radius +
            (shapeStyle.stroke?.width ?? 0) / 2 +
            config.selection.padding +
            config.selection.width / 2,
          color: "none",
          stroke: {
            width: config.selection.width,
            color: config.selection.color,
          },
        }
        Object.assign(shapeConfig, shape)
      } else {
        const shape: RectangleShapeStyle = {
          type: "rect",
          width:
            shapeStyle.width +
            (shapeStyle.stroke?.width ?? 0) +
            config.selection.padding * 2 +
            config.selection.width,
          height:
            shapeStyle.height +
            (shapeStyle.stroke?.width ?? 0) +
            config.selection.padding * 2 +
            config.selection.width,
          borderRadius:
            shapeStyle.borderRadius > 0 ? shapeStyle.borderRadius + config.selection.padding : 0,
          color: "none",
          stroke: {
            width: config.selection.width,
            color: config.selection.color,
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
.v-node-selection {
  pointer-events: none;
}
</style>
