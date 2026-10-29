<script setup lang="ts">
import { computed, readonly, ref, toRaw, toRef, watch } from "vue"
import { Reactive, nonNull } from "@/common/common"
import { Configs, LiteUserConfigs, LiteViewConfig, UserConfigs } from "@/common/configs"
import { EventHandlers, Nodes, Edges, Layouts, UserLayouts, Layers, Paths } from "@/common/types"
import { isMouseWheelZoomEnabled, useGraphCanvas } from "@/composables/canvas"
import { provideConfigs } from "@/composables/config"
import { provideCurrentPositions } from "@/composables/currentPositions"
import { provideEventEmitter } from "@/composables/event-emitter"
import { useGraphLoading } from "@/composables/graphLoading"
import {
  GRAPH_SYSTEM_SLOTS,
  LayerSlotProps,
  useBuiltInLayerOrder,
  useLayerDefs,
} from "@/composables/layer"
import { useLayoutsBinding } from "@/composables/layout"
import { makeMarkerState } from "@/composables/marker"
import { provideMouseOperation } from "@/composables/mouse"
import { providePositionWriter } from "@/composables/positionWriter"
import { provideSelections } from "@/composables/selection"
import { provideStates, makeStateInput } from "@/composables/state"
import { useViewMethods } from "@/composables/viewMethods"
import { useViewMode } from "@/composables/viewMode"
import { bindProp, bindPropKeySet } from "@/utils/props"
import VBackgroundGrid from "./background/VBackgroundGrid.vue"
import VBackgroundViewport from "./background/VBackgroundViewport.vue"
import VSelectionBox from "./base/VSelectionBox.vue"
import VLiteEdgesLayer from "./lite/VLiteEdgesLayer.vue"
import VLiteNodeLabelsLayer from "./lite/VLiteNodeLabelsLayer.vue"
import VLiteNodesLayer from "./lite/VLiteNodesLayer.vue"
import VMarkerHead from "./marker/VMarkerHead.vue"

const BUILT_IN_LAYERS = ["edges", "nodes", "node-labels"] as const

const DEFAULT_LAYOUTS_UPDATE_INTERVAL = 300

interface Props {
  nodes?: Nodes
  edges?: Edges
  layouts?: UserLayouts
  zoomLevel?: number
  selectedNodes?: string[]
  selectedEdges?: string[]
  configs?: LiteUserConfigs
  layers?: Layers
  eventHandlers?: EventHandlers
}

const props = withDefaults(defineProps<Props>(), {
  nodes: () => ({}),
  edges: () => ({}),
  layouts: () => ({}),
  zoomLevel: 1,
  selectedNodes: () => [],
  selectedEdges: () => [],
  configs: () => ({}),
  layers: () => ({}),
  eventHandlers: () => ({}),
})

const emit = defineEmits<{
  (e: "update:zoomLevel", v: number): void
  (e: "update:layouts", v: Layouts): void
  (e: "update:selectedNodes", v: string[]): void
  (e: "update:selectedEdges", v: string[]): void
}>()

const slots = defineSlots<{
  [key: string]: (props: LayerSlotProps) => any
}>()

// Checked at setup, for code ported from VNetworkGraph.
const unsupported = GRAPH_SYSTEM_SLOTS.filter(name => name in slots).map(name => `#${name}`)
if (unsupported.length > 0) {
  console.warn(`VNetworkGraphLite does not support ${unsupported.join(", ")}.`)
}

const nodesRef = toRef(props, "nodes")
const edgesRef = toRef(props, "edges")
const pathsRef = ref<Paths>({})

// Event Bus
const emitter = provideEventEmitter()
Object.entries(props.eventHandlers).forEach(([type, event]) => {
  emitter.on(type as any, event as any)
})

// Style settings, with the edges straight and each on its own, as a lite graph draws them, and
// the defaults of its own settings, which the configs of VNetworkGraph do not have.
const configs = provideConfigs(
  computed<UserConfigs>(() => ({
    ...(props.configs as UserConfigs),
    view: {
      ...props.configs.view,
      layoutsUpdateInterval:
        props.configs.view?.layoutsUpdateInterval ?? DEFAULT_LAYOUTS_UPDATE_INTERVAL,
    } as UserConfigs["view"],
    edge: { ...props.configs.edge, type: "straight", summarize: false },
  }))
)
const viewConfig = configs.view as Configs["view"] & Pick<LiteViewConfig, "layoutsUpdateInterval">

// Additional layers
const { layerDefs, isShowGrid, isShowBackgroundViewport } = useLayerDefs(
  configs,
  slots,
  () => props.layers,
  GRAPH_SYSTEM_SLOTS
)

const builtInLayerOrder = useBuiltInLayerOrder(configs, slots, BUILT_IN_LAYERS)

// -----------------------------------------------------------------------
// SVG
// -----------------------------------------------------------------------
const zoomLevel = bindProp(props, "zoomLevel", emit, v => {
  v = Math.max(v, configs.view.minZoomLevel)
  v = Math.min(v, configs.view.maxZoomLevel)
  return v
})

const canvas = useGraphCanvas(zoomLevel, () => props.zoomLevel, configs, emitter)
const { container, svg, viewport, show, svgPanZoom, scale } = canvas

// -----------------------------------------------------------------------
// States of selected nodes/edges
// -----------------------------------------------------------------------
const currentSelectedNodes = bindPropKeySet(props, "selectedNodes", nodesRef, emit)
watch(currentSelectedNodes, nodes => emitter.emit("node:select", Array.from(nodes)))

const currentSelectedEdges = bindPropKeySet(props, "selectedEdges", edgesRef, emit)
watch(currentSelectedEdges, edges => emitter.emit("edge:select", Array.from(edges)))

const currentSelectedPaths = Reactive(new Set<string>())

provideSelections(currentSelectedNodes, currentSelectedEdges, currentSelectedPaths)

const hoveredNodes = Reactive(new Set<string>())
const hoveredEdges = Reactive(new Set<string>())
const hoveredPaths = Reactive(new Set<string>())
const currentLayouts = useLayoutsBinding(() => props.layouts)
const currentPositions = provideCurrentPositions(currentLayouts)

// -----------------------------------------------------------------------
// SVG Markers
// -----------------------------------------------------------------------
const markerState = makeMarkerState()

// -----------------------------------------------------------------------
// Mouse processing
// -----------------------------------------------------------------------

const { dragging, touches } = useViewMode(svgPanZoom, configs, emitter)

const {
  nodeStates,
  edgeStates,
  pathStates,
  positionChanges,
  layoutsChanged,
  edgeGeometries,
  placeEdgesAhead,
} = provideStates(
  makeStateInput(nodesRef, currentSelectedNodes, hoveredNodes),
  makeStateInput(edgesRef, currentSelectedEdges, hoveredEdges),
  makeStateInput(pathsRef, currentSelectedPaths, hoveredPaths),
  readonly(configs),
  currentLayouts,
  () => props.layouts,
  markerState,
  scale,
  currentPositions
)
const { makePositionDrawer, flushPositions } = providePositionWriter(
  currentPositions,
  edgeGeometries,
  positionChanges,
  viewport
)
// The tracking of the positions compares every position anyway, so it tells of the changes.
watch(layoutsChanged, () => emit("update:layouts", currentLayouts))

const isSvgWheelZoomEnabled = computed(() => isMouseWheelZoomEnabled(configs.view))

// mouse and touch support
const { isBoxSelectionMode, selectionBox, startBoxSelection, stopBoxSelection } =
  provideMouseOperation(
    svg,
    currentPositions.of,
    readonly(zoomLevel),
    nodeStates,
    edgeStates,
    pathStates,
    currentSelectedNodes,
    currentSelectedEdges,
    currentSelectedPaths,
    hoveredNodes,
    hoveredEdges,
    hoveredPaths,
    ref(false),
    isSvgWheelZoomEnabled,
    configs,
    emitter
  )

// -----------------------------------------------------------------------
// View methods and loading
// -----------------------------------------------------------------------

const view = useViewMethods(canvas, zoomLevel, nodesRef, currentPositions, configs, emitter)

// Lets a layout draw its ticks ahead of the layouts, which cost more to update.
const positionDrawer = makePositionDrawer(
  () => viewConfig.layoutsUpdateInterval,
  () => zoomLevel.value,
  placeEdgesAhead
)

useGraphLoading(canvas, view, nodesRef, configs, emitter, () => ({
  layouts: Reactive(currentLayouts.nodes), // deprecated parameter.
  nodePositions: toRef(currentLayouts, "nodes"),
  nodes: nodesRef,
  edges: edgesRef,
  configs: readonly(configs),
  scale: readonly(scale),
  emitter,
  svgPanZoom: nonNull(svgPanZoom.value),
  positionDrawer,
}))

// The layouts may lag behind the positions drawn, so this brings them up to date first.
// A copy, so that it stays as it was when taken.
function getLayouts(): Layouts {
  flushPositions()
  const nodes = Object.entries(toRaw(currentLayouts).nodes).map(([id, p]) => [id, { ...p }])
  return { nodes: Object.fromEntries(nodes) }
}

defineExpose({
  // methods
  getLayouts,
  fitToContents: view.fitToContents,
  panToCenter: view.panToCenter,
  getViewBox: view.getViewBox,
  setViewBox: view.setViewBox,
  startBoxSelection,
  stopBoxSelection,
  zoomIn: view.zoomIn,
  zoomOut: view.zoomOut,
  panTo: view.panTo,
  panBy: view.panBy,
  getPan: view.getPan,
  getSizes: view.getSizes,
  translateFromDomToSvgCoordinates: view.translateFromDomToSvgCoordinates,
  translateFromSvgToDomCoordinates: view.translateFromSvgToDomCoordinates,
  exportAsSvgText: view.exportAsSvgText,
  exportAsSvgElement: view.exportAsSvgElement,
})
</script>

<template>
  <div ref="container" class="v-network-graph v-network-graph-lite v-ng-container">
    <svg
      ref="svg"
      class="v-ng-canvas"
      :class="{ show, dragging, touches, 'box-selection-mode': isBoxSelectionMode }"
      width="100%"
      height="100%"
    >
      <!-- outside of viewport -->
      <template v-for="layerName in layerDefs['root']" :key="layerName">
        <slot :name="layerName" :scale="scale" />
      </template>

      <defs v-if="Object.keys(markerState.markers).length > 0">
        <v-marker-head
          v-for="(marker, id) in markerState.markers"
          :id="id"
          :key="id"
          :marker="marker"
          :scale="scale"
        />
      </defs>

      <!-- background-viewport:
           area outside the scope of SVG text retrieval but targeted by pan/zoom. -->
      <v-background-viewport v-if="isShowBackgroundViewport">
        <g v-for="layerName in layerDefs['background']" :key="layerName" class="v-ng-layer">
          <slot :name="layerName" :scale="scale" />
        </g>

        <!-- grid -->
        <v-background-grid v-if="isShowGrid" />

        <g v-for="layerName in layerDefs['grid']" :key="layerName" class="v-ng-layer">
          <slot :name="layerName" :scale="scale" />
        </g>
      </v-background-viewport>

      <!-- viewport: pan/zoom target and within the range of SVG text retrieval. -->
      <g ref="viewport" class="v-ng-viewport">
        <g v-for="layerName in layerDefs['base']" :key="layerName" class="v-ng-layer">
          <slot :name="layerName" :scale="scale" />
        </g>

        <!-- Sortable built-in layers -->
        <template v-for="layerName in builtInLayerOrder" :key="layerName">
          <v-lite-edges-layer v-if="layerName === 'edges'" />
          <v-lite-nodes-layer v-else-if="layerName === 'nodes'" />
          <v-lite-node-labels-layer v-else-if="layerName === 'node-labels'" />

          <!-- User defined layer -->
          <template v-for="customLayerName in layerDefs[layerName]" :key="customLayerName">
            <g class="v-ng-layer">
              <slot :name="customLayerName" :scale="scale" />
            </g>
          </template>
        </template>
      </g>

      <!-- selection box -->
      <v-selection-box
        v-if="selectionBox"
        :box="selectionBox"
        :config="configs.view.selection.box"
      />
    </svg>
  </div>
</template>
