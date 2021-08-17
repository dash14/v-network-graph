<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue"
import { nonNull } from "../common/common"
import { useContainers } from "../composables/container"

// By detecting and copying changes in the `transform` and `style`
// attributes reflected by svg-pan-zoom, it follows changes in the
// display area caused by panning and zooming.

const { svg } = useContainers()

// ref="background"
const background = ref<SVGGElement>()
const viewport = ref<SVGGElement>()

const updateAttributes = (attrs: string[], bgLayer: SVGGElement, vpLayer: SVGGElement) => {
  attrs.forEach(attr => bgLayer.setAttribute(attr, vpLayer.getAttribute(attr) ?? ""))
}

const observer = new MutationObserver(records => {
  if (!background.value || !viewport.value) return
  const attrs = records.map(r => r.attributeName ?? "").filter(Boolean)
  updateAttributes(attrs, background.value, viewport.value)
})

onMounted(() => {
  const vp = nonNull(svg.value.querySelector<SVGGElement>(".v-viewport"), "v-viewport")
  viewport.value = vp
  const attrs = ["transform", "style"]
  observer.observe(viewport.value, {
    attributes: true,
    attributeFilter: attrs
  })
  if (!background.value) return
  updateAttributes(attrs, background.value, vp)
})

onUnmounted(() => {
  observer.disconnect()
})

defineExpose({ background })
</script>

<template>
  <g ref="background" class="v-background-viewport">
    <slot />
  </g>
</template>
