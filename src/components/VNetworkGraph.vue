<script setup lang="ts">
import { readonly, ref, toRef, useSlots, computed, nextTick, watch, CSSProperties } from "vue"
import { EventHandlers, Nodes, Edges, InputPaths, Layouts, UserLayouts } from "@/common/types"
import { Layers, LayerPosition, LayerPositions, Point, Sizes } from "@/common/types"
import { Reactive, nonNull } from "@/common/common"
import { UserConfigs, ViewConfig } from "@/common/configs"
import { provideContainers } from "@/composables/container"
import { provideConfigs } from "@/composables/config"
import { provideStates, makeStateInput } from "@/composables/state"
import { provideMouseOperation } from "@/composables/mouse"
import { provideEventEmitter } from "@/composables/event-emitter"
import { makeMarkerState } from "@/composables/marker"
import { useSvgPanZoom } from "@/composables/svg-pan-zoom"
import { provideZoomLevel } from "@/composables/zoom"
import { useTransitionWhile } from "@/composables/transition"
import { useTranslatePathsToObject } from "@/composables/object"
import { bindProp, bindPropKeySet } from "@/utils/props"
import * as svgUtils from "@/utils/svg"
import { SvgPanZoomInstance, Box } from "@/modules/svg-pan-zoom-ex"
import { exportSvgElement, exportSvgElementWithOptions, ExportOptions } from "@/utils/svg"
import { provideSelections } from "@/composables/selection"
import { provideLayouts } from "@/composables/layout"
import { useBuiltInLayerOrder } from "@/composables/layer"
import VSelectionBox from "./base/VSelectionBox.vue"
import VMarkerHead from "./marker/VMarkerHead.vue"
import VBackgroundGrid from "./background/VBackgroundGrid.vue"
import VBackgroundViewport from "./background/VBackgroundViewport.vue"
import VEdgesLayer from "./layers/VEdgesLayer.vue"
import VEdgeLabelsLayer from "./layers/VEdgeLabelsLayer.vue"
import VFocusringLayer from "./layers/VFocusringLayer.vue"
import VNodesLayer from "./layers/VNodesLayer.vue"
import VNodeLabelsLayer from "./layers/VNodeLabelsLayer.vue"
import VPathsLayer from "./layers/VPathsLayer.vue"

const SYSTEM_SLOTS = [
  "override-node",
  "override-node-label",
  "edge-overlay",
  "edge-label",
  "edges-label",
]

enum State {
  INITIAL = 0,
  LOADED = 1,
  UNLOADED = 2,
}

interface Props {
  nodes?: Nodes
  edges?: Edges
  paths?: InputPaths
  layouts?: UserLayouts
  zoomLevel?: number
  selectedNodes?: string[]
  selectedEdges?: string[]
  selectedPaths?: string[]
  configs?: UserConfigs
  layers?: Layers
  eventHandlers?: EventHandlers
}

const props = withDefaults(defineProps<Props>(), {
  nodes: () => ({}),
  edges: () => ({}),
  paths: () => ({}),
  layouts: () => ({}),
  zoomLevel: 1,
  selectedNodes: () => [],
  selectedEdges: () => [],
  selectedPaths: () => [],
  configs: () => ({}),
  layers: () => ({}),
  eventHandlers: () => ({}),
})

const emit = defineEmits<{
  (e: "update:zoomLevel", v: number): void
  (e: "update:selectedNodes", v: string[]): void
  (e: "update:selectedEdges", v: string[]): void
  (e: "update:selectedPaths", v: string[]): void
  (e: "update:layouts", v: Layouts): void
}>()

const slots = useSlots()

const nodesRef = toRef(props, "nodes")
const edgesRef = toRef(props, "edges")
const { objects: pathsRef, isInCompatibilityModeForPath } = useTranslatePathsToObject(
  toRef(props, "paths")
)

// Event Bus
const emitter = provideEventEmitter()
Object.entries(props.eventHandlers).forEach(([type, event]) => {
  emitter.on(type as any, event as any)
})

// Style settings
const configs = provideConfigs(toRef(props, "configs"))

// Additional layers
const layerDefs = computed(() => {
  const definedSlots = new Set(Object.keys(slots))
  SYSTEM_SLOTS.forEach(s => definedSlots.delete(s))

  const layers = Object.fromEntries(LayerPositions.map(n => [n, [] as string[]]))
  Object.assign(
    layers,
    Object.entries(props.layers).reduce((accum, [name, type]) => {
      definedSlots.delete(name)
      if (type in accum) {
        accum[type].push(name)
      } else {
        accum[type] = [name]
      }
      return accum
    }, {} as Record<LayerPosition, string[]>)
  )
  // The default slot and any slots not defined in the layers into root.
  layers["root"].push(...definedSlots)
  return layers as Record<LayerPosition, string[]>
})

// Grid layer
const isShowGrid = computed(() => configs.view.grid.visible)
const isShowBackgroundViewport = computed(() => {
  const layers = layerDefs.value
  return isShowGrid.value || layers["background"].length > 0 || layers["grid"].length > 0
})

const builtInLayerOrder = useBuiltInLayerOrder(configs, slots)

// -----------------------------------------------------------------------
// SVG
// -----------------------------------------------------------------------
const container = ref<HTMLDivElement>()
const svg = ref<SVGElement & SVGSVGElement>()
const viewport = ref<SVGGElement>()
const state = ref<State>(State.INITIAL)
const show = computed(() => state.value !== State.INITIAL)

const zoomLevel = bindProp(props, "zoomLevel", emit, v => {
  v = Math.max(v, configs.view.minZoomLevel)
  v = Math.min(v, configs.view.maxZoomLevel)
  return v
})

// SVG pan / zoom
const { svgPanZoom, onSvgPanZoomMounted, onSvgPanZoomUnmounted } = useSvgPanZoom(svg, {
  viewportSelector: ".v-ng-viewport",
  minZoom: configs.view.minZoomLevel, // temporary
  maxZoom: configs.view.maxZoomLevel, // temporary
  dblClickZoomEnabled: isDoubleClickZoomEnabled(configs.view),
  mouseWheelZoomEnabled: isMouseWheelZoomEnabled(configs.view),
  fit: true,
  center: true,
  zoomEnabled: configs.view.zoomEnabled,
  preventMouseEventsDefault: false,
  onZoom: _ => {
    if (state.value === State.UNLOADED) return
    const z = svgPanZoom.value?.getRealZoom() ?? 1
    if (Math.abs(zoomLevel.value - z) >= 1.0e-6) {
      zoomLevel.value = z
      emitter.emit("view:zoom", z)
    }
  },
  panEnabled: configs.view.panEnabled,
  onPan: p => {
    if (state.value === State.UNLOADED) return
    emitter.emit("view:pan", p)
  },
})

provideContainers({ container, svg, viewport, svgPanZoom })

// Observe container resizing
const rectSize = { width: 0, height: 0 }
const resizeObserver = globalThis.ResizeObserver
  ? new ResizeObserver(() => {
      svgPanZoom.value?.resize()
      if (!configs.view.autoPanOnResize) return
      // Pan to keep the view area centered
      const r = container.value?.getBoundingClientRect()
      if (r) {
        const x = -(rectSize.width - r.width) / 2
        const y = -(rectSize.height - r.height) / 2
        svgPanZoom.value?.panBy({ x, y })
        const { width, height } = r
        if (rectSize.width !== width || rectSize.height !== height) {
          Object.assign(rectSize, { width, height })
          emitter.emit("view:resize", { x: r.x, y: r.y, width, height })
        }
      }
    })
  : undefined
onSvgPanZoomMounted(() => {
  const c = nonNull(container.value, "svg-pan-zoom container")
  resizeObserver?.observe(c)
  configs.view.onSvgPanZoomInitialized?.(nonNull(svgPanZoom.value, "svg-pan-zoom instance"))
  const r = c.getBoundingClientRect()
  const { width, height } = r
  Object.assign(rectSize, { width, height })
  viewport.value?.addEventListener("touchstart", stopEventPropagation, { passive: false })
})
onSvgPanZoomUnmounted(() => {
  resizeObserver?.disconnect()
  viewport.value?.removeEventListener("touchstart", stopEventPropagation)
})

const applyAbsoluteZoomLevel = (absoluteZoomLevel: number) => {
  svgPanZoom.value?.applyAbsoluteZoomLevel(
    absoluteZoomLevel,
    configs.view.minZoomLevel,
    configs.view.maxZoomLevel
  )
}

watch(
  () => configs.view.panEnabled,
  v => {
    svgPanZoom.value?.setPanEnabled(v)
  }
)
watch(
  () => [
    configs.view.zoomEnabled,
    isDoubleClickZoomEnabled(configs.view),
    isMouseWheelZoomEnabled(configs.view),
  ],
  () => {
    const svgPanZoomInstance = svgPanZoom.value
    if (!svgPanZoomInstance) return
    applyZoomEnabled(
      svgPanZoomInstance,
      configs.view.zoomEnabled,
      configs.view.doubleClickZoomEnabled,
      configs.view.mouseWheelZoomEnabled
    )
  }
)

watch(zoomLevel, v => applyAbsoluteZoomLevel(v))
watch(
  () => [configs.view.minZoomLevel, configs.view.maxZoomLevel],
  _ => {
    applyAbsoluteZoomLevel(zoomLevel.value)
  }
)

// Provide zoom level / scaling parameter
const { scale } = provideZoomLevel(zoomLevel, configs.view)

onSvgPanZoomMounted(() => {
  // apply initial zoom level
  const initialZoomLevel = props.zoomLevel
  applyAbsoluteZoomLevel(initialZoomLevel)
})

// To resolve the problem that the center position and
// magnification rate may not be recognized.
const updateBorderBox = (callback: () => void) => {
  if (Object.keys(props.nodes).length > 0) {
    svgPanZoom.value?.updateBBox()
    nextTick(callback)
  } else {
    callback()
  }
}

// Scales the content to fit in the SVG area.
const fitToContents = () => {
  updateBorderBox(() => {
    if (svgPanZoom.value) {
      svgPanZoom.value.fitToContents()
      emitter.emit("view:fit", undefined)
    }
  })
}

// Place content in the center of the SVG area.
const panToCenter = () => {
  updateBorderBox(() => {
    svgPanZoom.value?.center()
  })
}

// Get viewport box
const getViewBox = () =>
  svgPanZoom.value?.getViewBox() ?? {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  }

// Get viewport box
const setViewBox = (box: Box) => svgPanZoom.value?.setViewBox(box)

// -----------------------------------------------------------------------
// States of selected nodes/edges
// -----------------------------------------------------------------------
const currentSelectedNodes = bindPropKeySet(props, "selectedNodes", nodesRef, emit)
watch(currentSelectedNodes, nodes => emitter.emit("node:select", Array.from(nodes)))

const currentSelectedEdges = bindPropKeySet(props, "selectedEdges", edgesRef, emit)
watch(currentSelectedEdges, edges => emitter.emit("edge:select", Array.from(edges)))

const currentSelectedPaths = bindPropKeySet(props, "selectedPaths", pathsRef, emit)
watch(currentSelectedPaths, paths => emitter.emit("path:select", Array.from(paths)))

provideSelections(currentSelectedNodes, currentSelectedEdges, currentSelectedPaths)

const hoveredNodes = Reactive(new Set<string>())
const hoveredEdges = Reactive(new Set<string>())
const hoveredPaths = Reactive(new Set<string>())
const currentLayouts = Reactive<Layouts>({ nodes: {} })

provideLayouts(currentLayouts)

// two-way binding
watch(
  () => props.layouts,
  () => Object.assign(currentLayouts, props.layouts),
  { deep: true, immediate: true }
)
watch(currentLayouts, () => emit("update:layouts", currentLayouts), { deep: true })

// -----------------------------------------------------------------------
// SVG Markers
// -----------------------------------------------------------------------
const markerState = makeMarkerState()

// -----------------------------------------------------------------------
// Mouse processing
// -----------------------------------------------------------------------

// mouse pointer change on dragging
const dragging = ref<boolean>(false)
emitter.on("node:dragstart", _ => (dragging.value = true))
emitter.on("node:dragend", _ => (dragging.value = false))
emitter.on("view:mode", mode => {
  // avoid pan/zoom when using nodes and edges with multi-touch
  if (configs.view.panEnabled) {
    if (mode === "default") {
      svgPanZoom.value?.enablePan()
    } else {
      svgPanZoom.value?.disablePan()
    }
  }
  if (configs.view.zoomEnabled) {
    if (mode === "default") {
      svgPanZoom.value?.enableZoom()
    } else {
      svgPanZoom.value?.disableZoom()
    }
  }
})

const touches = computed(() => {
  return configs.view.panEnabled || configs.view.zoomEnabled || configs.node.draggable
})

const { nodeStates, edgeStates, pathStates } = provideStates(
  makeStateInput(nodesRef, currentSelectedNodes, hoveredNodes),
  makeStateInput(edgesRef, currentSelectedEdges, hoveredEdges),
  makeStateInput(pathsRef, currentSelectedPaths, hoveredPaths),
  readonly(configs),
  currentLayouts,
  markerState,
  scale
)

const isSvgWheelZoomEnabled = computed(() => isMouseWheelZoomEnabled(configs.view))

// mouse and touch support
const { isBoxSelectionMode, selectionBox, startBoxSelection, stopBoxSelection } =
  provideMouseOperation(
    svg,
    readonly(currentLayouts),
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
    isInCompatibilityModeForPath,
    isSvgWheelZoomEnabled,
    configs,
    emitter
  )

// -----------------------------------------------------------------------
// Node layout handler
// -----------------------------------------------------------------------

const activateParams = () => ({
  layouts: Reactive(currentLayouts.nodes), // deprecated parameter.
  nodePositions: toRef(currentLayouts, "nodes"),
  nodes: nodesRef,
  edges: edgesRef,
  configs: readonly(configs),
  scale: readonly(scale),
  emitter,
  svgPanZoom: nonNull(svgPanZoom.value),
})
watch(
  () => configs.view.layoutHandler,
  (newHandler, oldHandler) => {
    oldHandler.deactivate()
    newHandler.activate(activateParams())
  }
)

// -----------------------------------------------------------------------
// Transition of element positions
// -----------------------------------------------------------------------

// #transitionWhile() method
const { transitionWhile, transitionOption } = useTransitionWhile()
const transitionStyles = computed(() => {
  const o = transitionOption.value
  return (
    o.enabled
      ? {
          "--transition-duration": o.duration + "ms",
          "--transition-function": o.timingFunction,
        }
      : {}
  ) as CSSProperties
})

// -----------------------------------------------------------------------
// Events
// -----------------------------------------------------------------------

onSvgPanZoomMounted(() => {
  updateBorderBox(() => {
    // pan to center
    const svg = nonNull(svgPanZoom.value, "svg-pan-zoom")

    // activate layout handler.
    // (calc the positions of nodes whose positions are not specified)
    configs.view.layoutHandler.activate(activateParams())

    nextTick(() => {
      const autoPanAndZoom = configs.view.autoPanAndZoomOnLoad
      if (configs.view.fit || autoPanAndZoom !== false) {
        const nodesEmpty = Object.keys(props.nodes).length == 0
        if (nodesEmpty || autoPanAndZoom === "center-zero") {
          // Pan (0, 0) to the center.
          const sizes = svg.getSizes()
          svg.pan({
            x: sizes.width / 2,
            y: sizes.height / 2,
          })
        } else if (autoPanAndZoom === "fit-content" || configs.view.fit) {
          fitToContents()
        } else if (autoPanAndZoom === "center-content") {
          panToCenter()
        }
      }

      emitter.emit("view:load")

      // start displaying the svg
      state.value = State.LOADED
    })
  })
})

onSvgPanZoomUnmounted(() => {
  state.value = State.UNLOADED
  emitter.emit("view:unload")
  configs.view.layoutHandler.deactivate()
})

/**
 * Zoom in
 */
function zoomIn() {
  svgPanZoom.value?.zoomIn()
}

/**
 * Zoom out
 */
function zoomOut() {
  svgPanZoom.value?.zoomOut()
}

/**
 * Pan to a rendered position
 * @return {Point} point to pan
 */
function panTo(point: Point) {
  svgPanZoom.value?.pan(point)
}

/**
 * Relatively pan the graph by a specified rendered position vector
 * @return {Point} relative point to pan
 */
function panBy(point: Point) {
  svgPanZoom.value?.panBy(point)
}

/**
 * Get pan vector
 * @return {Point} pan vector
 */
function getPan(): Point {
  return nonNull(svgPanZoom.value).getPan()
}

/**
 * Get all calculate svg dimensions
 */
function getSizes(): Sizes {
  const sizes = nonNull(svgPanZoom.value).getSizes()
  return {
    width: sizes.width,
    height: sizes.height,
    viewBox: sizes.viewBox,
  }
}

/**
 * Translate from DOM to SVG coordinates
 * @return {Point} coordinates in the SVG
 */
function translateFromDomToSvgCoordinates(coordinates: Point): Point {
  return svgUtils.translateFromDomToSvgCoordinates(
    nonNull(svg.value, "svg"),
    nonNull(viewport.value, "viewport"),
    coordinates
  )
}

/**
 * Translate from SVG to DOM coordinates
 * @return {Point} coordinates in the DOM
 */
function translateFromSvgToDomCoordinates(coordinates: Point): Point {
  return svgUtils.translateFromSvgToDomCoordinates(
    nonNull(svg.value, "svg"),
    nonNull(viewport.value, "viewport"),
    coordinates
  )
}

/**
 * Get graph as SVG text.
 * @return {string} SVG text
 * @deprecated
 */
function getAsSvg(): string {
  const target = exportSvgElement(
    nonNull(svg.value, "svg"),
    nonNull(viewport.value, "viewport"),
    scale.value
  )
  return target.outerHTML
}

/**
 * Export graph as SVG text.
 * @return {string} SVG text
 */
async function exportAsSvgText(options: Partial<ExportOptions> = {}): Promise<string> {
  const target = exportAsSvgElement(options)
  return (await target).outerHTML
}

/**
 * Export graph as SVG element.
 * @return {SVGElement} SVG element
 */
async function exportAsSvgElement(options: Partial<ExportOptions> = {}): Promise<SVGElement> {
  return exportSvgElementWithOptions(
    nonNull(svg.value, "svg"),
    nonNull(viewport.value, "viewport"),
    scale.value,
    options
  )
}

defineExpose({
  // methods
  fitToContents,
  panToCenter,
  getViewBox,
  setViewBox,
  transitionWhile,
  startBoxSelection,
  stopBoxSelection,
  zoomIn,
  zoomOut,
  panTo,
  panBy,
  getPan,
  getSizes,
  translateFromDomToSvgCoordinates,
  translateFromSvgToDomCoordinates,
  getAsSvg,
  exportAsSvgText,
  exportAsSvgElement,
})

// local functions

function applyZoomEnabled(
  svgPanZoom: SvgPanZoomInstance,
  enable: boolean,
  enableDblClick: boolean,
  enableMouseWheel: boolean
): void {
  svgPanZoom.setZoomEnabled(enable)
  if (enable && enableDblClick) {
    svgPanZoom.enableDblClickZoom()
  } else {
    svgPanZoom.disableDblClickZoom()
  }
  if (enable && enableMouseWheel) {
    svgPanZoom.enableMouseWheelZoom()
  } else {
    svgPanZoom.disableMouseWheelZoom()
  }
}

function isDoubleClickZoomEnabled(view: ViewConfig): boolean {
  return view.zoomEnabled && view.doubleClickZoomEnabled
}

function isMouseWheelZoomEnabled(view: ViewConfig): boolean {
  return view.zoomEnabled && view.mouseWheelZoomEnabled
}

function stopEventPropagation(event: Event) {
  event.stopPropagation()
}
</script>

<template>
  <div ref="container" class="v-network-graph v-ng-container">
    <svg
      ref="svg"
      class="v-ng-canvas"
      :class="{ show, dragging, touches, 'box-selection-mode': isBoxSelectionMode }"
      width="100%"
      height="100%"
    >
      <!-- outside of viewport -->
      <slot
        v-for="layerName in layerDefs['root']"
        :key="layerName"
        :name="layerName"
        :scale="scale"
      />

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
      <g
        ref="viewport"
        class="v-ng-viewport"
        :class="{ 'v-ng-transition': transitionOption.enabled }"
        :style="transitionStyles"
      >
        <g v-for="layerName in layerDefs['base']" :key="layerName" class="v-ng-layer">
          <slot :name="layerName" :scale="scale" />
        </g>

        <!-- Sortable built-in layers -->
        <template v-for="layerName in builtInLayerOrder" :key="layerName">
          <!-- Edges -->
          <template v-if="layerName === 'edges'">
            <v-edges-layer>
              <template #edge-overlay="slotProps">
                <slot name="edge-overlay" v-bind="slotProps" />
              </template>
            </v-edges-layer>
          </template>

          <!-- Edge labels -->
          <template v-else-if="layerName === 'edge-labels'">
            <v-edge-labels-layer
              :enable-edge-label="'edge-label' in slots"
              :enable-edges-label="'edges-label' in slots"
            >
              <template #edge-label="slotProps">
                <slot name="edge-label" v-bind="slotProps" />
              </template>
              <template #edges-label="slotProps">
                <slot name="edges-label" v-bind="slotProps" />
              </template>
            </v-edge-labels-layer>
          </template>

          <!-- Node focusring -->
          <template v-else-if="layerName === 'focusring'">
            <v-focusring-layer />
          </template>

          <!-- Nodes -->
          <template v-else-if="layerName === 'nodes'">
            <v-nodes-layer>
              <template #override-node="slotProps">
                <slot name="override-node" v-bind="slotProps" />
              </template>
            </v-nodes-layer>
          </template>

          <!-- Node labels -->
          <template v-else-if="layerName === 'node-labels'">
            <v-node-labels-layer>
              <template #override-node-label="slotProps">
                <slot name="override-node-label" v-bind="slotProps" />
              </template>
            </v-node-labels-layer>
          </template>

          <!-- Paths -->
          <template v-else-if="layerName === 'paths'">
            <v-paths-layer />
          </template>

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

<style lang="scss">
:where(.v-ng-container) {
  width: 100%;
  height: 100%;
}

.v-ng-container {
  padding: 0;
  position: relative;
  user-select: none;
}

.v-ng-canvas {
  -webkit-tap-highlight-color: transparent;
  width: 100%;
  height: 100%;
  // Respond to disorder until the svgPanZoom library is activated
  opacity: 0;
  &.show {
    opacity: 1;
    transition: opacity 0.5s linear;
  }
}

.v-ng-canvas.dragging {
  * {
    cursor: grabbing !important;
  }
  .v-ng-line {
    transition: d 0s;
  }
}

.v-ng-canvas.touches {
  // prevent to perform browser's default action
  touch-action: none;
}

.v-ng-canvas.box-selection-mode {
  cursor: crosshair !important;
  * {
    cursor: crosshair !important;
  }
}

// transition options for #transitionWhile()
.v-ng-viewport.v-ng-transition {
  --transition-duration: 300ms;
  --transition-function: linear;
  .v-ng-node,
  .v-ng-node-label,
  .v-ng-node-focusring,
  .v-ng-edge,
  .v-ng-edge-label,
  .v-ng-path {
    transition: all var(--transition-duration) var(--transition-function);
    > * {
      transition: all var(--transition-duration) var(--transition-function);
    }
  }
}

.v-ng-line.animate,
.v-ng-path.animate {
  --animation-speed: 100;
  animation: v-ng-dash 10s linear infinite;
  stroke-dashoffset: var(--animation-speed);
}
@keyframes v-ng-dash {
  to {
    stroke-dashoffset: 0;
  }
}
</style>
