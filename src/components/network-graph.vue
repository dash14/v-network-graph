<template>
  <div ref="container" class="v-network-graph">
    <svg
      ref="svg"
      class="v-canvas"
      :class="{ show, dragging }"
      width="500"
      height="500"
      viewBox="0 0 500 500"
    >
      <!-- outside of viewport -->
      <slot
        v-for="layerName in layerDefs['root']"
        :key="layerName"
        :name="layerName"
        :scale="scale"
      />

      <defs v-if="Object.keys(markers).length > 0">
        <v-marker-head
          v-for="(marker, id) in markers"
          :id="id"
          :key="id"
          :marker="marker"
          :scale="scale"
        />
      </defs>

      <!-- background-viewport:
           area outside the scope of SVG text retrieval but targeted by pan/zoom. -->
      <v-background-viewport v-if="isShowBackgroundViewport">
        <g v-for="layerName in layerDefs['background']" :key="layerName" class="v-layer">
          <slot :name="layerName" :scale="scale" />
        </g>

        <!-- grid -->
        <v-background-grid v-if="isShowGrid" />

        <g v-for="layerName in layerDefs['grid']" :key="layerName" class="v-layer">
          <slot :name="layerName" :scale="scale" />
        </g>
      </v-background-viewport>

      <!-- viewport: pan/zoom target and within the range of SVG text retrieval. -->
      <g ref="viewport" class="v-viewport">
        <g v-for="layerName in layerDefs['base']" :key="layerName" class="v-layer">
          <slot :name="layerName" :scale="scale" />
        </g>

        <!-- edges -->
        <g class="v-layer-edges">
          <v-edge-backgrounds />
          <v-edge-groups />
        </g>

        <g v-for="layerName in layerDefs['edges']" :key="layerName" class="v-layer">
          <slot :name="layerName" :scale="scale" />
        </g>

        <!-- edge labels -->
        <v-edge-labels v-if="overrideEdgeLabels">
          <template #edge-label="slotProps">
            <slot name="edge-label" v-bind="slotProps" />
          </template>
        </v-edge-labels>

        <!-- summarized edges labels -->
        <v-edge-labels v-if="overrideEdgesLabels">
          <template #edges-label="slotProps">
            <slot name="edges-label" v-bind="slotProps" />
          </template>
        </v-edge-labels>

        <!-- node selections (focus ring) -->
        <g v-if="visibleNodeFocusRing" class="v-layer-nodes-selections">
          <v-node-focus-ring
            v-for="nodeId in currentSelectedNodes"
            :id="nodeId"
            :key="nodeId"
            :state="nodeStates[nodeId]"
            :pos="currentLayouts.nodes[nodeId]"
          />
        </g>

        <g v-for="layerName in layerDefs['focusring']" :key="layerName" class="v-layer">
          <slot :name="layerName" :scale="scale" />
        </g>

        <!-- nodes -->
        <transition-group
          :name="allConfigs.node.transition"
          :css="!!allConfigs.node.transition"
          tag="g"
          class="v-layer-nodes"
        >
          <v-node
            v-for="state in nodeZOrderedList"
            :id="state.id"
            :key="state.id"
            :state="state"
            :pos="currentLayouts.nodes[state.id]"
          >
            <!-- override the node -->
            <template v-if="overrideNodes" #override-node="slotProps">
              <slot name="override-node" v-bind="slotProps" />
            </template>
            <!-- override the node label -->
            <template v-if="overrideNodeLabels" #override-node-label="slotProps">
              <slot name="override-node-label" v-bind="slotProps" />
            </template>
          </v-node>
        </transition-group>

        <g v-for="layerName in layerDefs['nodes']" :key="layerName" class="v-layer">
          <slot :name="layerName" :scale="scale" />
        </g>

        <v-paths v-if="visiblePaths" />

        <g v-for="layerName in layerDefs['paths']" :key="layerName" class="v-layer">
          <slot :name="layerName" :scale="scale" />
        </g>
      </g>
    </svg>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, readonly, ref, toRef } from "vue"
import { computed, nextTick, watch } from "vue"
import {
  EventHandlers,
  Nodes,
  Edges,
  InputPaths,
  Layouts,
  UserLayouts,
} from "@/common/types"
import { Layers, LayerPosition, LayerPositions, Point, Sizes } from "@/common/types"
import { Reactive, nonNull } from "@/common/common"
import { UserConfigs } from "@/common/configs"
import { provideContainers } from "@/composables/container"
import { provideConfigs } from "@/composables/config"
import { provideStates, makeStateInput } from "@/composables/state"
import { provideMouseOperation } from "@/composables/mouse"
import { provideEventEmitter } from "@/composables/event-emitter"
import { makeMarkerState } from "@/composables/marker"
import { useSvgPanZoom } from "@/composables/svg-pan-zoom"
import { provideZoomLevel } from "@/composables/zoom"
import { useTranslatePathsToObject } from "@/composables/object"
import { bindProp, bindPropKeySet } from "@/utils/props"
import { translateFromSvgToDomCoordinates, translateFromDomToSvgCoordinates } from "@/utils/svg"
import VNode from "./node.vue"
import VNodeFocusRing from "./node-focus-ring.vue"
import VEdgeGroups from "./edge-groups.vue"
import VEdgeBackgrounds from "./edge-backgrounds.vue"
import VEdgeLabels from "./edge-labels.vue"
import VBackgroundViewport from "./background-viewport.vue"
import VBackgroundGrid from "./background-grid.vue"
import VPaths from "./paths.vue"
import VMarkerHead from "./marker-head.vue"

const SYSTEM_SLOTS = ["override-node", "override-node-label", "edge-label", "edges-label"]

enum State {
  INITIAL = 0,
  LOADED = 1,
  UNLOADED = 2,
}

export default defineComponent({
  components: {
    VNode,
    VNodeFocusRing,
    VEdgeGroups,
    VEdgeBackgrounds,
    VEdgeLabels,
    VBackgroundViewport,
    VBackgroundGrid,
    VPaths,
    VMarkerHead,
  },
  props: {
    nodes: {
      type: Object as PropType<Nodes>,
      default: () => ({}),
    },
    edges: {
      type: Object as PropType<Edges>,
      default: () => ({}),
    },
    paths: {
      type: [Object, Array] as PropType<InputPaths>,
      default: () => ({}),
    },
    layouts: {
      type: Object as PropType<UserLayouts>,
      default: () => ({}),
    },
    zoomLevel: {
      type: Number,
      default: 1,
    },
    selectedNodes: {
      type: Array as PropType<string[]>,
      default: () => [],
    },
    selectedEdges: {
      type: Array as PropType<string[]>,
      default: () => [],
    },
    selectedPaths: {
      type: Array as PropType<string[]>,
      default: () => [],
    },
    configs: {
      type: Object as PropType<UserConfigs>,
      default: () => ({}),
    },
    layers: {
      type: Object as PropType<Layers>,
      default: () => ({}),
    },
    eventHandlers: {
      // Since a large number of events will be issued, to avoid
      // contaminating the event log of the development tools,
      // events are designed to be notified to a handler function
      // specified by the user.
      type: Object as PropType<EventHandlers>,
      default: () => ({}),
    },
  },
  emits: [
    "update:zoomLevel",
    "update:selectedNodes",
    "update:selectedEdges",
    "update:selectedPaths",
    "update:layouts",
  ],
  setup(props, { emit, slots }) {
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

    // overrides
    const overrideNodes = computed(() => "override-node" in slots)
    const overrideNodeLabels = computed(() => "override-node-label" in slots)
    const overrideEdgeLabels = computed(() => "edge-label" in slots)
    const overrideEdgesLabels = computed(() => "edges-label" in slots)

    // -----------------------------------------------------------------------
    // SVG
    // -----------------------------------------------------------------------
    const container = ref<HTMLDivElement>()
    const svg = ref<SVGSVGElement>()
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
      viewportSelector: ".v-viewport",
      minZoom: configs.view.minZoomLevel, // temporary
      maxZoom: configs.view.maxZoomLevel, // temporary
      dblClickZoomEnabled: configs.view.doubleClickZoomEnabled,
      mouseWheelZoomEnabled: configs.view.mouseWheelZoomEnabled,
      fit: true,
      center: true,
      zoomEnabled: configs.view.zoomEnabled,
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
          const r = container.value?.getBoundingClientRect()
          if (r) {
            const x = -(rectSize.width - r.width) / 2
            const y = -(rectSize.height - r.height) / 2
            svgPanZoom.value?.panBy({ x, y })
            const { width, height } = r
            Object.assign(rectSize, { width, height })
            emitter.emit("view:resize", { x: r.x, y: r.y, width, height })
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
    })
    onSvgPanZoomUnmounted(() => {
      resizeObserver?.disconnect()
    })

    const applyAbsoluteZoomLevel = (absoluteZoomLevel: number) => {
      svgPanZoom.value?.applyAbsoluteZoomLevel(
        absoluteZoomLevel,
        configs.view.minZoomLevel,
        configs.view.maxZoomLevel
      )
    }

    watch(
      () => configs.view.doubleClickZoomEnabled,
      v => {
        if (v) {
          svgPanZoom.value?.enableDblClickZoom()
        } else {
          svgPanZoom.value?.disableDblClickZoom()
        }
      }
    )
    watch(
      () => configs.view.mouseWheelZoomEnabled,
      v => {
        if (v) {
          svgPanZoom.value?.enableMouseWheelZoom()
        } else {
          svgPanZoom.value?.disableMouseWheelZoom()
        }
      }
    )
    watch(
      () => configs.view.panEnabled,
      v => {
        svgPanZoom.value?.setPanEnabled(v)
      }
    )
    watch(
      () => configs.view.zoomEnabled,
      v => {
        svgPanZoom.value?.setZoomEnabled(v)
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

    // -----------------------------------------------------------------------
    // States of selected nodes/edges
    // -----------------------------------------------------------------------
    const currentSelectedNodes = bindPropKeySet(props, "selectedNodes", nodesRef, emit)
    watch(currentSelectedNodes, nodes => emitter.emit("node:select", Array.from(nodes)))

    const currentSelectedEdges = bindPropKeySet(props, "selectedEdges", edgesRef, emit)
    watch(currentSelectedEdges, edges => emitter.emit("edge:select", Array.from(edges)))

    const currentSelectedPaths = bindPropKeySet(props, "selectedPaths", pathsRef, emit)
    watch(currentSelectedPaths, paths => emitter.emit("path:select", Array.from(paths)))

    const hoveredNodes = Reactive(new Set<string>())
    const hoveredEdges = Reactive(new Set<string>())
    const hoveredPaths = Reactive(new Set<string>())
    const currentLayouts = Reactive<Layouts>({ nodes: {} })

    // two-way binding
    watch(
      () => props.layouts,
      () => Object.assign(currentLayouts, props.layouts),
      { deep: true, immediate: true }
    )
    watch(currentLayouts, () => emit("update:layouts", currentLayouts), { deep: true })

    const visibleNodeFocusRing = computed(() => {
      return configs.node.focusring.visible
    })

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

    const { nodeStates, nodeZOrderedList, edgeStates, pathStates } = provideStates(
      makeStateInput(nodesRef, currentSelectedNodes, hoveredNodes),
      makeStateInput(edgesRef, currentSelectedEdges, hoveredEdges),
      makeStateInput(pathsRef, currentSelectedPaths, hoveredPaths),
      readonly(configs),
      currentLayouts,
      markerState,
      scale
    )

    // mouse and touch support
    provideMouseOperation(
      svg,
      readonly(currentLayouts.nodes),
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
      emitter
    )

    // -----------------------------------------------------------------------
    // Paths
    // -----------------------------------------------------------------------
    const visiblePaths = computed(() => configs.path.visible)

    // -----------------------------------------------------------------------
    // Node layout handler
    // -----------------------------------------------------------------------

    const activateParams = () => ({
      layouts: Reactive(currentLayouts.nodes),
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
    // Events
    // -----------------------------------------------------------------------

    onSvgPanZoomMounted(() => {
      updateBorderBox(() => {
        // pan to center
        const svg = nonNull(svgPanZoom.value, "svg-pan-zoom")
        svg.center()

        // activate layout handler.
        // (calc the positions of nodes whose positions are not specified)
        configs.view.layoutHandler.activate(activateParams())

        nextTick(() => {
          if (Object.keys(props.nodes).length > 0) {
            // The center may change as a result of the position calculation above,
            // so re-center.
            if (configs.view.fit) {
              fitToContents()
            } else {
              panToCenter()
            }
          } else {
            // Pan (0, 0) to the center.
            const sizes = svg.getSizes()
            svg.pan({
              x: sizes.width / 2,
              y: sizes.height / 2,
            })
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

    return {
      // html ref
      container,
      svg,
      viewport,
      show,

      // instance
      svgPanZoom,

      // properties
      allConfigs: configs,
      layerDefs,
      isShowGrid,
      isShowBackgroundViewport,
      overrideNodes,
      overrideNodeLabels,
      overrideEdgeLabels,
      overrideEdgesLabels,
      scale,
      nodeStates,
      nodeZOrderedList,
      currentSelectedNodes,
      markers: markerState.markers,
      dragging,
      currentLayouts,
      visibleNodeFocusRing,
      visiblePaths,

      // methods
      fitToContents,
      panToCenter,
    }
  },
  methods: {
    /**
     * Zoom in
     */
    zoomIn() {
      this.svgPanZoom?.zoomIn()
    },
    /**
     * Zoom out
     */
    zoomOut() {
      this.svgPanZoom?.zoomOut()
    },
    /**
     * Pan to a rendered position
     * @return {Point} point to pan
     */
    panTo(point: Point) {
      this.svgPanZoom?.pan(point)
    },
    /**
     * Relatively pan the graph by a specified rendered position vector
     * @return {Point} relative point to pan
     */
    panBy(point: Point) {
      this.svgPanZoom?.panBy(point)
    },
    /**
     * Get pan vector
     * @return {Point} pan vector
     */
    getPan(): Point {
      return nonNull(this.svgPanZoom).getPan()
    },
    /**
     * Get all calculate svg dimensions
     */
    getSizes(): Sizes {
      const sizes = nonNull(this.svgPanZoom).getSizes()
      return {
        width: sizes.width,
        height: sizes.height,
        viewBox: sizes.viewBox,
      }
    },
    /**
     * Translate from DOM to SVG coordinates
     * @return {Point} coordinates in the SVG
     */
    translateFromDomToSvgCoordinates(coordinates: Point): Point {
      return translateFromDomToSvgCoordinates(
        nonNull(this.svg, "svg"),
        nonNull(this.viewport, "viewport"),
        coordinates
      )
    },
    /**
     * Translate from SVG to DOM coordinates
     * @return {Point} coordinates in the DOM
     */
    translateFromSvgToDomCoordinates(coordinates: Point): Point {
      return translateFromSvgToDomCoordinates(
        nonNull(this.svg, "svg"),
        nonNull(this.viewport, "viewport"),
        coordinates
      )
    },
    /**
     * Get graph as SVG text.
     * @return {string} SVG text
     */
    getAsSvg(): string {
      const element = nonNull(this.svg, "svg")
      const viewport = nonNull(this.viewport, "svg viewport")

      const target = element.cloneNode(true) as SVGSVGElement

      const box = viewport.getBBox()
      const z = 1 / this.scale
      const svg = {
        x: Math.floor((box.x - 10) * z),
        y: Math.floor((box.y - 10) * z),
        width: Math.ceil((box.width + 20) * z),
        height: Math.ceil((box.height + 20) * z),
      }
      target.setAttribute("width", svg.width.toString())
      target.setAttribute("height", svg.height.toString())

      const v = target.querySelector(".v-viewport") as SVGGElement
      v.setAttribute("transform", `translate(${-svg.x} ${-svg.y}), scale(${z})`)
      v.removeAttribute("style")

      target.setAttribute("viewBox", `0 0 ${svg.width} ${svg.height}`)

      let data = target.outerHTML

      // cleanup
      data = data.replaceAll(/ data-v-[0-9a-z]+=""/g, "")
      data = data.replaceAll(/<!--[\s\S]*?-->/gm, "")
      return data
    },
  },
})
</script>

<style lang="scss" scoped>
.v-network-graph {
  padding: 0;
  position: relative;
  width: 100%;
  height: 100%;
  user-select: none;
}
.v-canvas {
  width: 100%;
  height: 100%;
  // svgPanZoomライブラリが有効になるまでの乱れへの対応
  opacity: 0;
  &.show {
    opacity: 1;
    transition: opacity 0.5s linear;
  }
}

.v-canvas.dragging {
  :deep(*) {
    cursor: grabbing !important;
  }
  :deep(.v-line) {
    transition: d 0s;
  }
}
</style>
