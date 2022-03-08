<script setup lang="ts">
import { computed } from "vue"
import { PositionOrCurve } from "@/common/types"
import { Config } from "@/common/configs"
import { PathState } from "@/models/path"
import { useStates } from "@/composables/state"
import { usePathConfig } from "@/composables/config"
import { useZoomLevel } from "@/composables/zoom"
import { calculatePathPoints } from "@/modules/calculation/path"
import { useMouseOperation } from "@/composables/mouse"
import VPathLine from "./VPathLine.vue"

const { pathZOrderedList, nodeStates, edgeStates, layouts } = useStates()
const { scale } = useZoomLevel()
const pathConfig = usePathConfig()

const {
  handlePathPointerDownEvent,
  handlePathPointerOverEvent,
  handlePathPointerOutEvent,
  handlePathContextMenu,
} = useMouseOperation()

const calcPathPoints = computed(() => (path: PathState): PositionOrCurve[] => {
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
})

defineExpose({
  pathConfig,
  pathZOrderedList,
  calcPathPoints,
  handlePathPointerDownEvent,
  handlePathPointerOverEvent,
  handlePathPointerOutEvent,
  handlePathContextMenu,
})
</script>

<template>
  <transition-group
    :name="pathConfig.transition"
    :css="!!pathConfig.transition"
    tag="g"
    class="v-paths"
  >
    <v-path-line
      v-for="path in pathZOrderedList"
      :key="path.id"
      :points="calcPathPoints(path)"
      :class="{ clickable: path.clickable, hoverable: path.hoverable }"
      :path="path"
      @pointerdown="handlePathPointerDownEvent(path.id, $event)"
      @pointerenter.passive="handlePathPointerOverEvent(path.id, $event)"
      @pointerleave.passive="handlePathPointerOutEvent(path.id, $event)"
      @contextmenu="handlePathContextMenu(path.id, $event)"
    />
  </transition-group>
</template>

<style lang="scss" scoped>
$transition: 0.1s linear;

.v-path-line {
  pointer-events: none;
  transition: stroke $transition, stroke-width $transition;

  &.clickable {
    pointer-events: stroke;
    cursor: pointer;
  }
  &.hoverable {
    pointer-events: stroke;
  }
}
</style>
