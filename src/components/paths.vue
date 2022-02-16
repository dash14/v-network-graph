<script setup lang="ts">
import { computed, PropType, ref, watchEffect } from "vue"
import { Edges, Path, InputPaths, PositionOrCurve } from "@/common/types"
import { Reactive } from "@/common/common"
import { Config } from "@/common/configs"
import { PathState, PathStateDatum } from "@/models/path"
import { useStates } from "@/composables/state"
import { usePathConfig } from "@/composables/config"
import { useZoomLevel } from "@/composables/zoom"
import { useEventEmitter } from "@/composables/event-emitter"
import { useObjectState } from "@/composables/objectState"
import { calculatePathPoints } from "@/modules/calculation/path"
import VPathLine from "./path-line.vue"

const props = defineProps({
  paths: {
    type: [Array, Object] as PropType<InputPaths>,
    required: true,
  },
  edges: {
    type: Object as PropType<Edges>,
    required: true,
  },
})

const { nodeStates, edgeStates, layouts } = useStates()
const { scale } = useZoomLevel()
const emitter = useEventEmitter()
const pathConfig = usePathConfig()

let nextId = 1
const idStore = new Map<Path, string>()

const compatibilityMode = ref(false)
const pathObjects = ref<Record<string, Path>>({})

// translate for compatibility
watchEffect(() => {
  if (props.paths instanceof Array) {
    const containKeys = new Set<string>([])
    pathObjects.value = Object.fromEntries(
      props.paths.map(path => {
        let id = path.id
        if (!id) {
          if (!compatibilityMode.value) {
            compatibilityMode.value = true
            console.warn(
              "Please specify the `id` field for the `Path` object." +
                " Currently, this works for compatibility," +
                " but in the future, the id field will be required."
            )
          }
          id = idStore.get(path)
          if (!id) {
            id = "path-" + nextId++
            idStore.set(path, id)
          }
        }
        containKeys.add(id)
        return [id, path]
      })
    )
    if (compatibilityMode.value) {
      for (const [path, id] of Array.from(idStore.entries())) {
        if (!containKeys.has(id)) {
          idStore.delete(path)
        }
      }
    }
  } else {
    pathObjects.value = Object.fromEntries(
      Object.entries(props.paths).map(([id, path]) => {
        return [id, path]
      })
    )
  }
})

const selectedPaths = Reactive<Set<string>>(new Set())
const hoveredPaths = Reactive<Set<string>>(new Set())

const {
  states: pathStates,
  zOrderedList: pathZOrderedList, //
} = useObjectState<Path, PathStateDatum, PathState>(
  pathObjects,
  pathConfig,
  selectedPaths,
  hoveredPaths,
  (paths, id, newState) => {
    const state = newState as PathStateDatum
    state.path = paths.value[id]
    state.edges = computed(() => {
      const path = paths.value[id]
      return path.edges.map(edgeId => ({ edgeId, edge: props.edges[edgeId] })).filter(e => e.edge)
    })
  }
)

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

  if (compatibilityMode.value) {
    emitter.emit("path:click", { path: path.path as any, event })
  } else {
    emitter.emit("path:click", { path: path.id, event })
  }
}

const emitPathDoubleClickedEvent = (path: PathState, event: MouseEvent) => {
  if (!pathConfig.clickable) return
  event.stopPropagation()
  event.preventDefault()

  if (compatibilityMode.value) {
    emitter.emit("path:dblclick", { path: path.path as any, event })
  } else {
    emitter.emit("path:dblclick", { path: path.id, event })
  }
}

const emitPathContextMenuEvent = (path: PathState, event: MouseEvent) => {
  if (!pathConfig.clickable) return

  if (compatibilityMode.value) {
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
