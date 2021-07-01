<template>
  <nt-shape
    class="nt-node-selection"
    :base-x="x"
    :base-y="y"
    :styles="styles"
    :zoom="zoom"
  />
</template>

<script lang="ts">
import { computed, defineComponent, PropType, reactive, watchEffect } from "vue"
import { CircleShapeStyle, Position, RectangleShapeStyle, ShapeStyle } from "@/common/types"
import { useNodeStyle, useNodeSelectionStyle } from "@/composables/style"
import NtShape from "@/objects/shape.vue"

export default defineComponent({
  components: { NtShape },
  props: {
    pos: {
      type: Object as PropType<Position>,
      required: false,
      default: undefined,
    },
    zoom: {
      type: Number,
      required: true,
    },
  },
  setup(props) {
    const x = computed(() => props.pos?.x || 0)
    const y = computed(() => props.pos?.y || 0)

    const nodeStyle = useNodeStyle()
    const selectionStyle = useNodeSelectionStyle()
    const styles = reactive<ShapeStyle>({} as any)

    watchEffect(() => {
      const shapeStyle = nodeStyle.shape
      if (shapeStyle.type === "circle") {
        const shape: CircleShapeStyle = {
          type: "circle",
          radius:
            shapeStyle.radius +
            (shapeStyle.stroke?.width ?? 0) / 2 +
            selectionStyle.padding +
            selectionStyle.width / 2,
          color: "none",
          stroke: {
            width: selectionStyle.width,
            color: selectionStyle.color,
          },
        }
        Object.assign(styles, shape)
      } else {
        const shape: RectangleShapeStyle = {
          type: "rect",
          width:
            shapeStyle.width +
            (shapeStyle.stroke?.width ?? 0) +
            selectionStyle.padding * 2 +
            selectionStyle.width,
          height:
            shapeStyle.height +
            (shapeStyle.stroke?.width ?? 0) +
            selectionStyle.padding * 2 +
            selectionStyle.width,
          borderRadius:
            shapeStyle.borderRadius > 0 ? shapeStyle.borderRadius + selectionStyle.padding : 0,
          color: "none",
          stroke: {
            width: selectionStyle.width,
            color: selectionStyle.color,
          },
        }
        Object.assign(styles, shape)
      }
    })

    return { x, y, selectionStyle, styles }
  },
})
</script>

<style lang="scss" scoped>
.nt-node-selection {
  pointer-events: none;
}
</style>
