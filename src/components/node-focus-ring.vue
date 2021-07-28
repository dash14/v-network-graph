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
import { CircleShapeStyle, getConfig, RectangleShapeStyle, ShapeStyle } from "../common/configs"
import { useNodeConfig } from "../composables/style"
import VShape from "./shape.vue"

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
