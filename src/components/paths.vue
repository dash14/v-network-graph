<script setup lang="ts">
import { computed } from "vue"
import { PositionOrCurve } from "@/common/types"
import { Config } from "@/common/configs"
import { PathState } from "@/models/path"
import { useStates } from "@/composables/state"
import { usePathConfig } from "@/composables/config"
import { useZoomLevel } from "@/composables/zoom"
import { useEventEmitter } from "@/composables/event-emitter"
import { calculatePathPoints } from "@/modules/calculation/path"
import VPathLine from "./path-line.vue"

const props = defineProps({
  isCompatibilityMode: {
    type: Boolean,
    required: false,
    default: false
  }
})

const { pathZOrderedList, nodeStates, edgeStates, layouts } = useStates()
const { scale } = useZoomLevel()
const emitter = useEventEmitter()
const pathConfig = usePathConfig()

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

const emitPathClickedEvent = (path: PathState, event: MouseEvent) => {
  if (!pathConfig.clickable) return
  event.stopPropagation()
  event.preventDefault()

  if (props.isCompatibilityMode) {
    emitter.emit("path:click", { path: path.path as any, event })
  } else {
    emitter.emit("path:click", { path: path.id, event })
  }
}

const emitPathDoubleClickedEvent = (path: PathState, event: MouseEvent) => {
  if (!pathConfig.clickable) return
  event.stopPropagation()
  event.preventDefault()

  if (props.isCompatibilityMode) {
    emitter.emit("path:dblclick", { path: path.path as any, event })
  } else {
    emitter.emit("path:dblclick", { path: path.id, event })
  }
}

const emitPathContextMenuEvent = (path: PathState, event: MouseEvent) => {
  if (!pathConfig.clickable) return

  if (props.isCompatibilityMode) {
    emitter.emit("path:contextmenu", { path: path.path as any, event })
  } else {
    emitter.emit("path:contextmenu", { path: path.id, event })
  }
}

function stopPointerEventPropagation(event: PointerEvent) {
  // Prevent view from capturing events
  if (pathConfig.clickable) {
    event.preventDefault()
    event.stopPropagation()
  }
}

defineExpose({
  pathConfig,
  pathZOrderedList,
  calcPathPoints,
  emitPathClickedEvent,
  emitPathContextMenuEvent,
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
      :class="{ clickable: pathConfig.clickable }"
      :path="path.path"
      @pointerdown="stopPointerEventPropagation($event)"
      @click="emitPathClickedEvent(path, $event)"
      @dblclick="emitPathDoubleClickedEvent(path, $event)"
      @contextmenu="emitPathContextMenuEvent(path, $event)"
    />
  </transition-group>
</template>

<style lang="scss" scoped>
.v-path-line {
  pointer-events: none;
  &.clickable {
    pointer-events: stroke;
    cursor: pointer;
  }
}
</style>
