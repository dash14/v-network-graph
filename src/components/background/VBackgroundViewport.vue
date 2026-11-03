<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue"
import { nonNull } from "@/common/common"
import { useContainers } from "@/composables/container"

// By detecting and copying changes in the `transform` and `style`
// attributes reflected by svg-pan-zoom, it follows changes in the
// display area caused by panning and zooming.

const { viewport } = useContainers()

// ref="background"
const background = ref<SVGGElement>()

const updateAttributes = (attrs: string[], bgLayer: SVGGElement, vpLayer: SVGGElement) => {
  attrs.forEach(attr => bgLayer.setAttribute(attr, vpLayer.getAttribute(attr) ?? ""))
}

// It observes only while mounted, and only attributes, so every record names one.
const observer = new MutationObserver(records => {
  const attrs = records.map(r => nonNull(r.attributeName))
  updateAttributes(attrs, nonNull(background.value), viewport.value)
})

onMounted(() => {
  const attrs = ["transform", "style"]
  observer.observe(viewport.value, {
    attributes: true,
    attributeFilter: attrs,
  })
  updateAttributes(attrs, nonNull(background.value), viewport.value)
})

onUnmounted(() => {
  observer.disconnect()
})
</script>

<template>
  <g ref="background" class="v-ng-background-viewport">
    <slot />
  </g>
</template>
