import { computed } from "vue"
import { StrokeStyle } from "@/common/configs"
import { applyScaleToDasharray, getDasharrayUnit } from "@/utils/visual"

export function useStrokeAttributes(props: Readonly<{ config: StrokeStyle, scale: number }>) {
  return computed(() => {
    const scale = props.scale
    const speed = props.config.animate
      ? getDasharrayUnit(props.config.dasharray) * props.config.animationSpeed * scale
      : false
    return {
      class: { animate: props.config.animate },
      stroke: props.config.color,
      "stroke-width": props.config.width * scale,
      "stroke-dasharray": applyScaleToDasharray(props.config.dasharray, scale),
      "stroke-linecap": props.config.linecap,
      style: speed ? `--animation-speed:${speed}` : undefined,
    }
  })
}
