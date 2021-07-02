<template>
  <nt-shape
    class="nt-node-selection"
    :base-x="x"
    :base-y="y"
    :styles="shapeStyles"
  />
</template>

<script lang="ts">
import { computed, defineComponent, PropType, reactive, watchEffect } from "vue"
import { CircleShapeStyle, Position, RectangleShapeStyle, ShapeStyle } from "@/common/types"
import { useNodeStyle } from "@/composables/style"
import NtShape from "@/objects/shape.vue"

export default defineComponent({
  components: { NtShape },
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

    const style = useNodeStyle()
    const shapeStyles = reactive<ShapeStyle>({} as any)

    watchEffect(() => {
      const shapeStyle = style.shape
      if (shapeStyle.type === "circle") {
        const shape: CircleShapeStyle = {
          type: "circle",
          radius:
            shapeStyle.radius +
            (shapeStyle.stroke?.width ?? 0) / 2 +
            style.selection.padding +
            style.selection.width / 2,
          color: "none",
          stroke: {
            width: style.selection.width,
            color: style.selection.color,
          },
        }
        Object.assign(shapeStyles, shape)
      } else {
        const shape: RectangleShapeStyle = {
          type: "rect",
          width:
            shapeStyle.width +
            (shapeStyle.stroke?.width ?? 0) +
            style.selection.padding * 2 +
            style.selection.width,
          height:
            shapeStyle.height +
            (shapeStyle.stroke?.width ?? 0) +
            style.selection.padding * 2 +
            style.selection.width,
          borderRadius:
            shapeStyle.borderRadius > 0 ? shapeStyle.borderRadius + style.selection.padding : 0,
          color: "none",
          stroke: {
            width: style.selection.width,
            color: style.selection.color,
          },
        }
        Object.assign(shapeStyles, shape)
      }
    })

    return { x, y, shapeStyles }
  },
})
</script>

<style lang="scss" scoped>
.nt-node-selection {
  pointer-events: none;
}
</style>
