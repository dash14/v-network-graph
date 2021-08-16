<template>
  <rect
    v-if="area && dominantBaseline === 'central'"
    v-bind="pos"
    :rx="config.background.borderRadius * scale"
    :ry="config.background.borderRadius * scale"
    :fill="config.background.color"
    :transform="transform"
  />
  <v-text
    v-if="area"
    ref="element"
    v-bind="$attrs"
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
import { defineComponent, PropType, reactive, Ref, ref, watch, watchEffect } from "vue"
import { onMounted, onUnmounted } from "vue"
import { useZoomLevel } from "../composables/zoom"
import { EdgeLabelStyle } from "../common/configs"
import { EdgeLabelArea } from "../common/types"
import * as V from "../common/vector"
import VText from "./text.vue"

type Rect = { x: number; y: number; width: number; height: number }

function updateBackgroundPosition(
  element: SVGTextElement,
  pos: Rect,
  transform: Ref<string | undefined>,
  config: EdgeLabelStyle,
  scale: number
) {
  const bbox = element.getBBox()
  const padding = config.background.padding
  pos.x = bbox.x - padding * scale
  pos.y = bbox.y - padding * scale
  pos.width = bbox.width + padding * 2 * scale
  pos.height = bbox.height + padding * 2 * scale
  transform.value = element.getAttribute("transform") ?? undefined
}

function enableMutationObserver(
  element: SVGTextElement,
  pos: Rect,
  transform: Ref<string | undefined>,
  config: EdgeLabelStyle,
  scale: Ref<number>
) {
  const observer = new MutationObserver(() => {
    updateBackgroundPosition(element, pos, transform, config, scale.value)
  })
  observer.observe(element, {
    attributes: true,
    attributeFilter: ["x", "y", "transform", "font-size"],
  })
  updateBackgroundPosition(element, pos, transform, config, scale.value)
  return observer
}

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
        padding: 0,
      }),
    },
    text: {
      type: String,
      required: false,
      default: "",
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
      default: false,
    },
  },
  setup(props) {
    const { scale } = useZoomLevel()

    const x = ref(0)
    const y = ref(0)
    const textAnchor: Ref<"middle" | "start" | "end"> = ref("middle")
    const dominantBaseline: Ref<"text-top" | "hanging" | "central"> = ref("central")
    const transform = ref("")
    const element = ref<InstanceType<typeof VText>>()

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
      let angle = V.fromPositions(s.above, t.above).v.angleDeg()
      if (angle < -90 || angle >= 90) {
        angle = angle + 180
        if (angle > 180) {
          angle -= 360
        }
      }
      transform.value = `rotate(${angle} ${x.value} ${y.value})`
    })

    // Show background only if it overlaps an edge line.
    const pos = reactive<Rect>({ x: 0, y: 0, width: 0, height: 0 })

    let observer: MutationObserver | undefined

    onMounted(() => {
      if (!element.value) return
      if (dominantBaseline.value === "central") {
        observer = enableMutationObserver(element.value.$el, pos, transform, props.config, scale)
      }
    })

    watch(dominantBaseline, (v, prev) => {
      if (!element.value || v === prev) return
      if (dominantBaseline.value === "central") {
        observer = enableMutationObserver(element.value.$el, pos, transform, props.config, scale)
      } else {
        observer?.disconnect()
        observer = undefined
      }
    })

    onUnmounted(() => {
      observer?.disconnect()
      observer = undefined
    })

    return { x, y, textAnchor, dominantBaseline, transform, element, pos, scale }
  },
})
</script>
