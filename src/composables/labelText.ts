import { computed } from "vue"
import { LabelStyle } from "@/common/configs"
import { useZoomLevel } from "@/composables/zoom"

/**
 * The lines of a label text, and where they are put.
 * @param props the text, its style and its baseline
 * @param givenFontSize the font size given instead of the style's, if any
 * @returns the lines, the font size, the line height and the offset of the first line
 */
export function useLabelTextLines(
  props: { text: string; config: LabelStyle; dominantBaseline: string },
  givenFontSize: () => number | undefined = () => undefined
) {
  const { scale } = useZoomLevel()

  const texts = computed(() => props.text?.toString().split(/\r?\n/) ?? "")

  const fontSize = computed(() => {
    return givenFontSize() ?? props.config.fontSize * scale.value
  })

  const lineHeight = computed(() => fontSize.value * props.config.lineHeight)

  const topDeltaY = computed(() => {
    const dominantBaseline = props.dominantBaseline
    if (dominantBaseline === "hanging") {
      return 0
    } else if (dominantBaseline === "central") {
      return -(lineHeight.value * (texts.value.length - 1)) / 2
    } else {
      // "auto", "text-top"
      return -lineHeight.value * (texts.value.length - 1)
    }
  })

  return { texts, fontSize, lineHeight, topDeltaY }
}
