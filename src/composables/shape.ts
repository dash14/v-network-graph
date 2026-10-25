import { ref, watchEffect } from "vue"
import { AnyShapeStyle } from "@/common/configs"
import { useZoomLevel } from "@/composables/zoom"
import { applyScaleToDasharray } from "@/utils/visual"

/**
 * The attributes of a shape at the current scale.
 * @param props the style of the shape, and the position of its center
 * @returns the attributes, as refs
 */
export function useShapeAttributes(props: { config: AnyShapeStyle; baseX: number; baseY: number }) {
  const { scale } = useZoomLevel()

  const x = ref(props.baseX)
  const y = ref(props.baseY)
  const strokeWidth = ref(0)
  const strokeColor = ref("#000000")
  const strokeDasharray = ref<string | number | undefined>(undefined)
  const radius = ref(0)
  const width = ref(0)
  const height = ref(0)
  const borderRadius = ref(0)

  watchEffect(() => {
    const s = scale.value
    strokeWidth.value = props.config.strokeWidth * s
    strokeColor.value = props.config.strokeColor ?? "none"
    strokeDasharray.value = applyScaleToDasharray(props.config.strokeDasharray, s)

    if (props.config.type === "circle") {
      x.value = props.baseX
      y.value = props.baseY
      radius.value = props.config.radius * s
    } else {
      width.value = props.config.width * s
      height.value = props.config.height * s
      borderRadius.value = props.config.borderRadius * s
      x.value = props.baseX - width.value / 2
      y.value = props.baseY - height.value / 2
    }
  })

  return { x, y, strokeWidth, strokeColor, strokeDasharray, radius, width, height, borderRadius }
}
