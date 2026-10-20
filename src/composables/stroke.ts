import { CSSProperties, computed } from "vue"
import { StrokeStyle } from "@/common/configs"
import { useZoomLevel } from "@/composables/zoom"
import { applyScaleToDasharray, getAnimationSpeed } from "@/utils/visual"

/** The attributes of a line's stroke, scaled to the zoom level. */
export function useStrokeAttributes(config: () => StrokeStyle) {
  const { scale } = useZoomLevel()

  const strokeWidth = computed(() => config().width * scale.value)

  const strokeDasharray = computed(() => applyScaleToDasharray(config().dasharray, scale.value))

  const animationSpeed = computed(() => {
    const style = getAnimationSpeed("--animation-speed", config(), scale.value)
    return style["--animation-speed"] ? (style as CSSProperties) : undefined
  })

  return { strokeWidth, strokeDasharray, animationSpeed }
}
