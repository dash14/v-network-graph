<script setup lang="ts">
import { computed, Ref, ref, watchEffect } from "vue"
import { EdgeLabelStyle } from "@/common/configs"
import { Edge, EdgeLabelArea } from "@/common/types"
import { VectorLine } from "@/modules/calculation/line"
import VText from "@/components/base/VLabelText.vue"

interface Props {
  area: EdgeLabelArea
  config: EdgeLabelStyle
  text?: string
  align?: "center" | "source" | "target"
  verticalAlign?: "center" | "above" | "below"
  // The followings are the definitions to avoid passing unwanted
  // items to <text> when they are specified in v-bind.
  edge?: Edge
  hovered?: boolean
  selected?: boolean
  scale?: number
}

const props = withDefaults(defineProps<Props>(), {
  text: "",
  align: "center",
  verticalAlign: "center",
  edge: undefined,
  hovered: undefined,
  selected: undefined,
  scale: undefined,
})

const x = ref(0)
const y = ref(0)
const textAnchor: Ref<"middle" | "start" | "end"> = ref("middle")
const dominantBaseline: Ref<"text-top" | "hanging" | "central"> = ref("central")
const angle = ref(0)

watchEffect(() => {
  const s = props.area.source
  const t = props.area.target
  if (props.align === "source") {
    if (s.above.x == t.above.x) {
      textAnchor.value = s.above.y > t.above.y ? "start" : "end"
    } else {
      textAnchor.value = s.above.x < t.above.x ? "start" : "end"
    }
    if (props.verticalAlign === "above") {
      x.value = s.above.x
      y.value = s.above.y
      dominantBaseline.value = "text-top"
    } else if (props.verticalAlign === "below") {
      x.value = s.below.x
      y.value = s.below.y
      dominantBaseline.value = "hanging"
    } else {
      // center
      x.value = (s.above.x + s.below.x) / 2
      y.value = (s.above.y + s.below.y) / 2
      dominantBaseline.value = "central"
    }
  } else if (props.align === "target") {
    if (s.above.x == t.above.x) {
      textAnchor.value = s.above.y < t.above.y ? "start" : "end"
    } else {
      textAnchor.value = s.above.x > t.above.x ? "start" : "end"
    }
    if (props.verticalAlign === "above") {
      x.value = t.above.x
      y.value = t.above.y
      dominantBaseline.value = "text-top"
    } else if (props.verticalAlign === "below") {
      x.value = t.below.x
      y.value = t.below.y
      dominantBaseline.value = "hanging"
    } else {
      // center
      x.value = (t.above.x + t.below.x) / 2
      y.value = (t.above.y + t.below.y) / 2
      dominantBaseline.value = "central"
    }
  } else {
    // center
    textAnchor.value = "middle"
    if (props.verticalAlign === "above") {
      x.value = (s.above.x + t.above.x) / 2
      y.value = (s.above.y + t.above.y) / 2
      dominantBaseline.value = "text-top"
    } else if (props.verticalAlign === "below") {
      x.value = (s.below.x + t.below.x) / 2
      y.value = (s.below.y + t.below.y) / 2
      dominantBaseline.value = "hanging"
    } else {
      // center
      x.value = (s.above.x + t.below.x) / 2
      y.value = (s.above.y + t.below.y) / 2
      dominantBaseline.value = "central"
    }
  }
  let degree = VectorLine.fromPositions(s.above, t.above).v.angleDegree()
  if (degree < -90 || degree >= 90) {
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
  <!-- <g>
    <circle
      :cx="area.source.above.x"
      :cy="area.source.above.y"
      r="3"
      fill="red"
    />
    <circle
      :cx="area.target.above.x"
      :cy="area.target.above.y"
      r="3"
      fill="green"
    />
    <circle
      :cx="area.source.below.x"
      :cy="area.source.below.y"
      r="3"
      fill="blue"
    />
    <circle
      :cx="area.target.below.x"
      :cy="area.target.below.y"
      r="3"
      fill="orange"
    />
  </g> -->
</template>
