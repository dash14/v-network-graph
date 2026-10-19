import { CSSProperties, computed } from "vue"
import { StrokeStyle } from "@/common/configs"
import { useZoomLevel } from "@/composables/zoom"
import { applyScaleToDasharray, getDasharrayUnit } from "@/utils/visual"

/** The attributes of a line's stroke, scaled to the zoom level. */
export function useStrokeAttributes(config: () => StrokeStyle) {
  const { scale } = useZoomLevel()

  const strokeWidth = computed(() => config().width * scale.value)

  const strokeDasharray = computed(() => applyScaleToDasharray(config().dasharray, scale.value))

  const animationSpeed = computed(() => {
    const { animate, dasharray, animationSpeed } = config()
    const speed = animate ? getDasharrayUnit(dasharray) * animationSpeed * scale.value : false
    return speed ? ({ "--animation-speed": speed } as CSSProperties) : undefined
  })

  return { strokeWidth, strokeDasharray, animationSpeed }
}
