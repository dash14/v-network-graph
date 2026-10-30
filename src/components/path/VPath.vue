<script setup lang="ts">
import { computed } from "vue"
import { Config } from "@/common/configs"
import { PositionOrCurve } from "@/common/types"
import { usePathConfig } from "@/composables/config"
import { useStates } from "@/composables/state"
import { useStrokeAttributes } from "@/composables/stroke"
import { useZoomLevel } from "@/composables/zoom"
import { PathState } from "@/models/path"
import { calculatePathPoints, quadraticCurveCommands } from "@/modules/calculation/path"

const props = defineProps<{
  path: PathState
}>()

const { nodeStates, edgeStates, layouts } = useStates()
const { scale } = useZoomLevel()
const pathConfig = usePathConfig()

function calcPathPoints(path: PathState): PositionOrCurve[] {
  if (path.edges.length === 0) return []
  const margin = Config.value(pathConfig.margin, path.path) * scale.value
  return calculatePathPoints(
    path,
    nodeStates,
    layouts.nodes,
    edgeStates,
    scale.value,
    pathConfig.curveInNode,
    pathConfig.end,
    margin
  )
}

function calcPathD(path: PathState) {
  const points = calcPathPoints(path)
  let move = true
  return points
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
        list.push(...quadraticCurveCommands(p))
        return list.join(" ")
      } else {
        const m = move
        move = false
        return `${m ? "M " : "L "}${p.x} ${p.y}`
      }
    })
    .join(" ")
}

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

const { strokeWidth, strokeDasharray, animationSpeed } = useStrokeAttributes(() => config.value)
</script>

<template>
  <path
    :class="{
      'v-ng-path': true,
      animate: config.animate,
      clickable: path.clickable,
      hoverable: path.hoverable,
    }"
    :d="calcPathD(path)"
    fill="none"
    :stroke="config.color"
    :stroke-width="strokeWidth"
    :stroke-dasharray="strokeDasharray"
    :stroke-linecap="config.linecap"
    :stroke-linejoin="config.linejoin"
    :style="animationSpeed"
  />
</template>

<style lang="scss">
$transition: 0.1s linear;

.v-ng-path {
  pointer-events: none;

  &.clickable {
    pointer-events: stroke;
    cursor: pointer;
  }
  &.hoverable {
    pointer-events: stroke;
  }
}

// Moved paths restyle faster with no transition to check, as the edges do.
:where(.v-ng-viewport:not([data-moving])) .v-ng-path {
  transition:
    stroke $transition,
    stroke-width $transition;
}
</style>
