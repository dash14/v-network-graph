<template>
  <v-text
    v-if="area && dominantBaseline == 'central'"
    class="v-edge-label-background"
    :text="text"
    :x="x"
    :y="y"
    v-bind="backgroundConfig"
    :text-anchor="textAnchor"
    :dominant-baseline="dominantBaseline"
    :transform="transform"
  />
  <v-text
    v-if="area"
    class="v-edge-label"
    :text="text"
    :x="x"
    :y="y"
    :config="config"
    :text-anchor="textAnchor"
    :dominant-baseline="dominantBaseline"
    :transform="transform"
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

<script lang="ts">
import { computed, defineComponent, PropType, Ref, ref, watchEffect } from "vue"
import { EdgeLabelStyle } from "../common/configs"
import { EdgeLabelArea } from "../common/types"
import { useZoomLevel } from "../composables/zoom"
import * as V from "../common/vector"
import VText from "./text.vue"

export default defineComponent({
  components: { VText },
  props: {
    area: {
      type: Object as PropType<EdgeLabelArea>,
      required: false,
      default: undefined,
    },
    config: {
      type: Object as PropType<EdgeLabelStyle>,
      required: false,
      default: () => ({
        fontSize: 10,
        color: "#000000",
        margin: 0,
        padding: 0
      })
    },
    text: {
      type: String,
      required: false,
      default: ""
    },
    align: {
      type: String as PropType<"center" | "source" | "target">,
      default: "center",
    },
    verticalAlign: {
      type: String as PropType<"center" | "above" | "below">,
      default: "center",
    },
    multiline: {
      type: Boolean,
      default: false
    }
  },
  setup(props) {
    const { scale } = useZoomLevel()

    const x = ref(0)
    const y = ref(0)
    const textAnchor: Ref<"middle" | "start" | "end"> = ref("middle")
    const dominantBaseline: Ref<"text-top" | "hanging" | "central"> = ref("central")
    const transform = ref("")

    watchEffect(() => {
      if (!props.area) return
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
        } else { // center
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
        } else { // center
          x.value = (t.above.x + t.below.x) / 2
          y.value = (t.above.y + t.below.y) / 2
          dominantBaseline.value = "central"
        }
      } else { // center
        textAnchor.value = "middle"
        if (props.verticalAlign === "above") {
          x.value = (s.above.x + t.above.x) / 2
          y.value = (s.above.y + t.above.y) / 2
          dominantBaseline.value = "text-top"
        } else if (props.verticalAlign === "below") {
          x.value = (s.below.x + t.below.x) / 2
          y.value = (s.below.y + t.below.y) / 2
          dominantBaseline.value = "hanging"
        } else { // center
          x.value = (s.above.x + t.below.x) / 2
          y.value = (s.above.y + t.below.y) / 2
          dominantBaseline.value = "central"
        }
      }
      let angle = V.fromPositions(s.above, t.above).v.angleDeg()
      if (angle < -90 || angle >= 90) {
        angle = (angle + 180)
        if (angle > 180) {
          angle -= 360
        }
      }
      transform.value = `rotate(${angle} ${x.value} ${y.value})`
    })

    const backgroundConfig = computed(() => {
      return {
        "stroke": "#ffffff",
        "stroke-width": props.config.padding * scale.value,
        "style": "opacity: .7",
        config: {
          color: "#ffffff",
          fontFamily: props.config.fontFamily,
          fontSize: props.config.fontSize
        }
      }
    })

    return { x, y, textAnchor, dominantBaseline, transform, backgroundConfig }
  },
})
</script>
