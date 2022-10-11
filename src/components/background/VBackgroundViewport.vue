<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue"
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

const observer = new MutationObserver(records => {
  if (!background.value) return
  const attrs = records.map(r => r.attributeName ?? "").filter(Boolean)
  updateAttributes(attrs, background.value, viewport.value)
})

onMounted(() => {
  const attrs = ["transform", "style"]
  observer.observe(viewport.value, {
    attributes: true,
    attributeFilter: attrs
  })
  if (!background.value) return
  updateAttributes(attrs, background.value, viewport.value)
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
