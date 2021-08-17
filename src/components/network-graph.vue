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
      <g class="v-viewport">
        <g v-for="layerName in layerDefs['base']" :key="layerName" class="v-layer">
          <slot :name="layerName" :scale="scale" />
        </g>

        <!-- edges -->
        <g class="v-layer-edges">
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
        <g class="v-layer-nodes">
          <v-node
            v-for="(state, nodeId) in nodeStates"
            :id="nodeId.toString()"
            :key="nodeId"
            :state="state"
            :pos="currentLayouts.nodes[nodeId]"
          >
            <!-- overide the node -->
            <template v-if="overrideNodes" #override-node="slotProps">
              <slot name="override-node" v-bind="slotProps" />
            </template>
            <!-- override the node label -->
            <template v-if="overrideNodeLabels" #override-node-label="slotProps">
              <slot name="override-node-label" v-bind="slotProps" />
            </template>
          </v-node>
        </g>

        <v-paths v-if="visiblePaths" :paths="paths" :edges="edges" />

        <g v-for="layerName in layerDefs['nodes']" :key="layerName" class="v-layer">
          <slot :name="layerName" :scale="scale" />
        </g>
      </g>
    </svg>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, readonly, ref } from "vue"
import { computed, nextTick, watch } from "vue"
import { bindProp, bindPropKeySet } from "../common/props"
import { provideContainers } from "../composables/container"
import { provideConfigs } from "../composables/config"
import { provideStates } from "../composables/state"
import { provideMouseOperation } from "../composables/mouse"
import { provideEventEmitter } from "../composables/event-emitter"
import { useSvgPanZoom } from "../composables/svg-pan-zoom"
import { provideZoomLevel } from "../composables/zoom"
import { EventHandlers, Nodes, Edges, Paths, Layouts, UserLayouts } from "../common/types"
import { Layers, LayerPosition, LayerPositions, Point, Sizes } from "../common/types"
import { Reactive, nonNull } from "../common/common"
import { UserConfigs } from "../common/configs"
import VNode from "./node.vue"
import VNodeFocusRing from "./node-focus-ring.vue"
import VEdgeGroups from "./edge-groups.vue"
import VEdgeLabels from "./edge-labels.vue"
import VBackgroundViewport from "./background-viewport.vue"
import VBackgroundGrid from "./background-grid.vue"
import VPaths from "./paths.vue"

const SYSTEM_SLOTS = ["override-node", "override-node-label", "edge-label"]

export default defineComponent({
  components: {
    VNode,
    VNodeFocusRing,
    VEdgeGroups,
    VEdgeLabels,
    VBackgroundViewport,
    VBackgroundGrid,
    VPaths,
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
    configs: {
      type: Object as PropType<UserConfigs>,
      default: () => ({}),
    },
    paths: {
      type: Array as PropType<Paths>,
      default: () => [],
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
  emits: ["update:zoomLevel", "update:selectedNodes", "update:selectedEdges", "update:layouts"],
  setup(props, { emit, slots }) {
    // Event Bus
    const emitter = provideEventEmitter()
    Object.entries(props.eventHandlers).forEach(([type, event]) => {
      emitter.on(type as any, event as any)
    })

    // Style settings
    const configs = provideConfigs(props.configs)

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

    // -----------------------------------------------------------------------
    // SVG
    // -----------------------------------------------------------------------
    const container = ref<HTMLDivElement>()
    const svg = ref<SVGElement>()
    const show = ref<boolean>(false)

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
      fit: true,
      center: true,
      zoomEnabled: configs.view.zoomEnabled,
      onZoom: _ => {
        const z = svgPanZoom.value?.getRealZoom() ?? 1
        if (Math.abs(zoomLevel.value - z) >= 1.0e-6) {
          zoomLevel.value = z
          emitter.emit("view:zoom", z)
        }
      },
      panEnabled: configs.view.panEnabled,
      onPan: p => emitter.emit("view:pan", p),
    })

    provideContainers({ container, svg, svgPanZoom })

    // Observe container resizing
    const rectSize = { width: 0, height: 0 }
    const resizeObserver = new ResizeObserver(() => {
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
    onSvgPanZoomMounted(() => {
      const c = nonNull(container.value, "svg-pan-zoom container")
      resizeObserver.observe(c)
      configs.view.onSvgPanZoomInitialized?.(nonNull(svgPanZoom.value, "svg-pan-zoom instance"))
      const r = c.getBoundingClientRect()
      const { width, height } = r
      Object.assign(rectSize, { width, height })
    })
    onSvgPanZoomUnmounted(() => {
      resizeObserver.disconnect()
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
      svgPanZoom.value?.updateBBox()
      nextTick(callback)
    }

    // Scales the content to fit in the SVG area.
    const fitToContents = () => {
      updateBorderBox(() => {
        svgPanZoom.value?.fitToContents()
        emitter.emit("view:fit", undefined)
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
    const currentSelectedNodes = bindPropKeySet(props, "selectedNodes", props.nodes, emit)
    watch(currentSelectedNodes, nodes => emitter.emit("node:select", Array.from(nodes)))

    const currentSelectedEdges = bindPropKeySet(props, "selectedEdges", props.edges, emit)
    watch(currentSelectedEdges, edges => emitter.emit("edge:select", Array.from(edges)))

    const currentLayouts = Reactive<Layouts>({ nodes: {} })

    // two-way binding
    watch(
      () => props.layouts,
      () => Object.assign(currentLayouts, props.layouts),
      { deep: true, immediate: true }
    )
    watch(currentLayouts, () => emit("update:layouts", currentLayouts), { deep: true })

    const visibleNodeFocusRing = computed(() => {
      return configs.node.selectable && configs.node.focusring.visible
    })

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

    // mouse and touch support
    const { hoveredNodes, hoveredEdges } = provideMouseOperation(
      svg,
      readonly(currentLayouts.nodes),
      readonly(zoomLevel),
      readonly(configs),
      currentSelectedNodes,
      currentSelectedEdges,
      emitter
    )

    const { nodeStates } = provideStates(
      readonly(props.nodes),
      readonly(props.edges),
      currentSelectedNodes,
      currentSelectedEdges,
      hoveredNodes,
      hoveredEdges,
      readonly(configs),
      currentLayouts,
      scale
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
      nodes: readonly(props.nodes),
      edges: readonly(props.edges),
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
        svgPanZoom.value?.center()

        // activate layout handler.
        // (calc the positions of nodes whose positions are not specified)
        configs.view.layoutHandler.activate(activateParams())

        nextTick(() => {
          // The center may change as a result of the position calculation above,
          // so re-center.
          if (configs.view.fit) {
            fitToContents()
          } else {
            panToCenter()
          }

          emitter.emit("view:load")

          // start displaying the svg
          show.value = true
        })
      })
    })

    onSvgPanZoomUnmounted(() => {
      emitter.emit("view:unload")
      configs.view.layoutHandler.deactivate()
    })

    return {
      // html ref
      container,
      svg,
      show,

      // instance
      svgPanZoom,

      // properties
      layerDefs,
      isShowGrid,
      isShowBackgroundViewport,
      overrideNodes,
      overrideNodeLabels,
      overrideEdgeLabels,
      scale,
      nodeStates,
      currentSelectedNodes,
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
     * Get graph as SVG text.
     * @return {string} SVG text
     */
    getAsSvg(): string {
      const element = this.svg
      const viewport = element?.querySelector(".v-viewport") as SVGGElement

      const target = document.createElement("svg")
      target.setAttribute("xmlns", "http://www.w3.org/2000/svg")

      if (viewport) {
        const box = viewport.getBBox()
        const svg = {
          x: Math.floor(box.x) - 10,
          y: Math.floor(box.y) - 10,
          width: Math.ceil(box.width) + 20,
          height: Math.ceil(box.height) + 20,
        }
        target.setAttribute("width", svg.width.toString())
        target.setAttribute("height", svg.height.toString())

        const v = viewport.cloneNode(true) as SVGGElement
        v.setAttribute("transform", `translate(${-svg.x} ${-svg.y})`)
        v.removeAttribute("style")
        target.appendChild(v)

        target.setAttribute("viewBox", `0 0 ${svg.width} ${svg.height}`)
      }

      return target.outerHTML
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
  transition: opacity 0.5s linear;
  &.show {
    opacity: 1;
  }
}

.v-canvas.dragging,
.v-canvas.dragging * {
  cursor: grabbing !important;
}
</style>
