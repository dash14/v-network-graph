<script setup lang="ts">
import { computed, Ref, ref, watchEffect } from "vue"
import { LabelStyle } from "@/common/configs"
import { LabelRectangle, Position } from "@/common/types"
import { VectorLine } from "@/modules/calculation/line"
import { isClockwise } from "@/modules/calculation/2d"
import { xor } from "@/modules/core/boolean"
import VText from "@/components/base/VLabelText.vue"

export type Align = "center" | "source" | "target"
export type VerticalAlign = "center" | "above" | "below"

interface Props {
  area: LabelRectangle
  config: LabelStyle
  text?: string
  align?: Align
  verticalAlign?: VerticalAlign
  visibleGuide?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  text: "",
  align: "center",
  verticalAlign: "center",
  visibleGuide: false,
})

const x = ref(0)
const y = ref(0)
const textAnchor: Ref<"middle" | "start" | "end"> = ref("middle")
const dominantBaseline: Ref<"text-top" | "hanging" | "central"> = ref("central")
const angle = ref(0)

watchEffect(() => {
  const s = props.area.source
  const t = props.area.target
  const flippedY = s.top.y > s.bottom.y
  let [sTop, sBottom, tTop, tBottom] = flippedY
    ? [s.bottom, s.top, t.bottom, t.top]
    : [s.top, s.bottom, t.top, t.bottom]

  const clockwise = isClockwise(s.bottom, s.top, t.top)
  const flipped = xor(flippedY, !clockwise)

  if (props.align === "source") {
    textAnchor.value = flipped ? "end" : "start"
    if (props.verticalAlign === "above") {
      x.value = sTop.x
      y.value = sTop.y
      dominantBaseline.value = "text-top"
    } else if (props.verticalAlign === "below") {
      x.value = sBottom.x
      y.value = sBottom.y
      dominantBaseline.value = "hanging"
    } else {
      // center
      x.value = (sTop.x + sBottom.x) / 2
      y.value = (sTop.y + sBottom.y) / 2
      dominantBaseline.value = "central"
    }
  } else if (props.align === "target") {
    textAnchor.value = flipped ? "start" : "end"
    if (props.verticalAlign === "above") {
      x.value = tTop.x
      y.value = tTop.y
      dominantBaseline.value = "text-top"
    } else if (props.verticalAlign === "below") {
      x.value = tBottom.x
      y.value = tBottom.y
      dominantBaseline.value = "hanging"
    } else {
      // center
      x.value = (tTop.x + tBottom.x) / 2
      y.value = (tTop.y + tBottom.y) / 2
      dominantBaseline.value = "central"
    }
  } else {
    // center
    textAnchor.value = "middle"
    if (props.verticalAlign === "above") {
      x.value = (sTop.x + tTop.x) / 2
      y.value = (sTop.y + tTop.y) / 2
      dominantBaseline.value = "text-top"
    } else if (props.verticalAlign === "below") {
      x.value = (sBottom.x + tBottom.x) / 2
      y.value = (sBottom.y + tBottom.y) / 2
      dominantBaseline.value = "hanging"
    } else {
      // center
      x.value = (sTop.x + tBottom.x) / 2
      y.value = (sTop.y + tBottom.y) / 2
      dominantBaseline.value = "central"
    }
  }

  const line = VectorLine.fromPositions(sTop, tTop)
  let degree = line.v.angleDegree()
  if (flipped) {
    degree = degree + 180
    if (degree > 180) {
      degree -= 360
    }
  }
  angle.value = degree
})

// If there is no background config and text overlaps the line,
// automatically set the background.
const updatedConfig = computed(() => {
  if (dominantBaseline.value === "central" && !props.config.background) {
    return {
      ...props.config,
      background: {
        visible: true,
        color: "#ffffff",
        padding: {
          vertical: 1,
          horizontal: 4,
        },
        borderRadius: 2,
      },
    }
  } else {
    return props.config
  }
})

function svgPos(pos: Position): string {
  return `${pos.x} ${pos.y}`
}

function rectPath() {
  const a = props.area
  return `M${svgPos(a.source.top)} L${svgPos(a.target.top)} L${svgPos(a.target.bottom)} L${svgPos(
    a.source.bottom
  )}Z`
}
</script>

<template>
  <v-text
    class="v-ng-edge-label"
    :text="text"
    :x="x"
    :y="y"
    :config="updatedConfig"
    :text-anchor="textAnchor"
    :dominant-baseline="dominantBaseline"
    :transform="`rotate(${angle} ${x} ${y})`"
  />
  <g v-if="visibleGuide">
    <path
      :d="rectPath()"
      stroke="#0000ff"
      stroke-width="1"
      stroke-dasharray="4"
      fill="none"
    />
    <!--
    <circle
      :cx="area.source.top.x"
      :cy="area.source.top.y"
      r="3"
      fill="blue"
    />
    <circle
      :cx="area.target.top.x"
      :cy="area.target.top.y"
      r="3"
      fill="blue"
    />
    <circle
      :cx="area.source.bottom.x"
      :cy="area.source.bottom.y"
      r="3"
      fill="red"
    />
    <circle
      :cx="area.target.bottom.x"
      :cy="area.target.bottom.y"
      r="3"
      fill="red"
    /> -->
  </g>
</template>
