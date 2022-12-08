<script setup lang="ts">
import { computed } from "vue"
import chunk from "lodash-es/chunk"
import { PositionOrCurve } from "@/common/types"
import { Config } from "@/common/configs"
import { PathState } from "@/models/path"
import { usePathConfig } from "@/composables/config"
import { useZoomLevel } from "@/composables/zoom"
import { applyScaleToDasharray, getDasharrayUnit } from "@/utils/visual"

const props = defineProps<{
  points: PositionOrCurve[]
  path: PathState
}>()

const { scale } = useZoomLevel()
const pathConfig = usePathConfig()

const d = computed(() => {
  let move = true
  return props.points
    .map(p => {
      if (p === null) {
        move = true
      } else if (typeof p === "string") {
        return p
      } else if (p instanceof Array) {
        p = [...p]
        const list = []
        if (p.length % 2 === 1) {
          const x = p[0]
          p = p.slice(1)
          list.push(`L ${x.x} ${x.y}`)
        }
        chunk(p, 2).map(([p1, p2]) => list.push(`Q ${p1.x} ${p1.y} ${p2.x} ${p2.y}`))
        return list.join(" ")
      } else {
        const m = move
        move = false
        return `${m ? "M " : "L "}${p.x} ${p.y}`
      }
    })
    .join(" ")
})

const config = computed(() => {
  const state = props.path
  if (state.selected) {
    return Config.values(pathConfig.selected, state.path)
  } else if (state.hovered && pathConfig.hover) {
    return Config.values(pathConfig.hover, state.path)
  } else {
    return Config.values(pathConfig.normal, state.path)
  }
})

const strokeDasharray = computed(() => {
  return applyScaleToDasharray(config.value.dasharray, scale.value)
})

const animationSpeed = computed(() => {
  const speed = config.value.animate
    ? getDasharrayUnit(config.value.dasharray) * config.value.animationSpeed * scale.value
    : false
  return speed ? `--animation-speed:${speed}` : undefined
})
</script>

<template>
  <path
    :class="{ 'v-ng-path-line': true, animate: config.animate }"
    :d="d"
    fill="none"
    :stroke="config.color"
    :stroke-width="config.width * scale"
    :stroke-dasharray="strokeDasharray"
    :stroke-linecap="config.linecap"
    :stroke-linejoin="config.linejoin"
    :style="animationSpeed"
  />
</template>
