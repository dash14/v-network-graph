<script setup lang="ts">
import { computed, PropType, reactive, Ref, ref, useAttrs, watch } from "vue"
import { onMounted, onUnmounted } from "vue"
import { LabelStyle } from "../common/configs"
import { useZoomLevel } from "../composables/zoom"

type Rect = { x: number; y: number; width: number; height: number }

function updateBackgroundPosition(
  element: SVGTextElement,
  pos: Rect,
  transform: Ref<string | undefined>
) {
  const bbox = element.getBBox()
  pos.x = bbox.x
  pos.y = bbox.y
  pos.width = bbox.width
  pos.height = bbox.height
  transform.value = element.getAttribute("transform") ?? undefined
}

function enableMutationObserver(
  element: SVGTextElement,
  pos: Rect,
  transform: Ref<string | undefined>
) {
  const observer = new MutationObserver(() => {
    updateBackgroundPosition(element, pos, transform)
  })
  observer.observe(element, {
    attributes: true,
    attributeFilter: ["x", "y", "transform", "font-size"],
  })
  updateBackgroundPosition(element, pos, transform)
  return observer
}

const props = defineProps({
  text: {
    type: String,
    required: true,
  },
  x: {
    type: Number,
    required: true,
  },
  y: {
    type: Number,
    required: true,
  },
  config: {
    type: Object as PropType<LabelStyle>,
    required: true,
  },
})

const attrs = useAttrs()

const { scale } = useZoomLevel()

const texts = computed(() => props.text.split(/\r?\n/))

const fontSize = computed(() => {
  return attrs['font-size'] as number ?? (props.config.fontSize * scale.value)
})

const lineHeight = computed(() => fontSize.value * props.config.lineHeight)

const topDeltaY = computed(() => {
  const dominantBaseline = attrs['dominant-baseline'] as string
  if (dominantBaseline === "hanging") {
    return 0
  } else if (dominantBaseline === "central") {
    return -(lineHeight.value * (texts.value.length - 1)) / 2
  } else {
    // "auto", "text-top"
    return -lineHeight.value * (texts.value.length - 1)
  }
})

const element = ref<SVGTextElement>()
const transform = ref("") // copy from <text>
const pos = reactive<Rect>({ x: 0, y: 0, width: 0, height: 0 })
const backgroundRectPos = computed(() => {
  const config = props.config.background
  if (!config) return pos
  let paddingVertical, paddingHorizontal
  if (config.padding instanceof Object) {
    paddingVertical = config.padding.vertical
    paddingHorizontal = config.padding.horizontal
  } else {
    paddingVertical = config.padding ?? 0
    paddingHorizontal = config.padding ?? 0
  }
  const lineMargin = lineHeight.value - fontSize.value
  return {
    x: pos.x - paddingHorizontal * scale.value,
    y: pos.y - paddingVertical * scale.value - (lineMargin / 2),
    width: pos.width + paddingHorizontal * 2 * scale.value,
    height: pos.height + paddingVertical * 2 * scale.value + lineMargin,
  }
})

let observer: MutationObserver | undefined
const updateObserver = () => {
  if (props.config.background && props.config.background.visible) {
    if (!observer && element.value) {
      observer = enableMutationObserver(element.value, pos, transform)
    }
  } else {
    observer?.disconnect()
    observer = undefined
  }
}

onMounted(() => updateObserver())
watch(
  () => props.config.background && props.config.background.visible,
  (v, prev) => {
    if (v == prev) return
    updateObserver()
  }
)
onUnmounted(() => {
  observer?.disconnect()
  observer = undefined
})

defineExpose({ fontSize, element, transform, backgroundRectPos, scale })
</script>

<template>
  <rect
    v-if="config.background && config.background.visible"
    v-bind="backgroundRectPos"
    :rx="(config.background?.borderRadius ?? 0) * scale"
    :ry="(config.background?.borderRadius ?? 0) * scale"
    :fill="config.background?.color ?? '#ffffff'"
    :transform="transform"
  />
  <text
    ref="element"
    class="v-text"
    v-bind="$attrs"
    :x="x"
    :y="y"
    :font-family="$attrs['font-family'] ? `${$attrs['font-family']}` : config.fontFamily"
    :font-size="fontSize"
    :fill="$attrs.fill ? `${$attrs.fill}` : config.color"
  >
    <template v-if="texts.length <= 1">
      {{ text }}
    </template>
    <template v-else>
      <tspan
        v-for="(t, i) in texts"
        :key="i"
        :x="x"
        :dy="i == 0 ? topDeltaY : lineHeight"
      >{{ t }}</tspan>
    </template>
  </text>
</template>
