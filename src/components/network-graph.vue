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

      <!-- viewport: pan/zoom の対象領域 -->
      <g class="v-viewport">
        <!-- background -->
        <template v-if="backgroundLayers.length > 0">
          <g class="v-layer-background">
            <slot v-for="layerName in backgroundLayers" :key="layerName" :name="layerName">
              <text
                x="0"
                y="30"
                fill="black"
                font-size="10"
                text-anchor="start"
                dominant-baseline="text-before-edge"
              >
                layer {{ layerName }}
              </text>
            </slot>
          </g>
        </template>

        <!-- edges -->
        <g class="v-layer-edges">
          <v-edge-groups
            :nodes="nodes"
            :edges="edges"
            :node-layouts="currentLayouts.nodes"
          />
        </g>

        <!-- node selections (focus ring) -->
        <g v-if="visibleNodeFocusRing" class="v-layer-nodes-selections">
          <v-node-focus-ring
            v-for="nodeId in currentSelectedNodes"
            :id="nodeId"
            :key="nodeId"
            :node="nodes[nodeId]"
            :pos="currentLayouts.nodes[nodeId]"
          />
        </g>

        <!-- nodes -->
        <g class="v-layer-nodes">
          <v-node
            v-for="(node, nodeId) in nodes"
            :id="nodeId.toString()"
            :key="nodeId"
            :node="node"
            :pos="currentLayouts.nodes[nodeId]"
            :selected="currentSelectedNodes.has(nodeId.toString())"
          />
        </g>
      </g>
    </svg>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, reactive, readonly, ref } from "vue"
import { computed, nextTick, watch } from "vue"
import { bindProp, bindPropKeySet } from "../common/props"
import { provideConfigs } from "../composables/style"
import { provideMouseOperation } from "../composables/mouse"
import { provideEventEmitter } from "../composables/event-emitter"
import { useSvgPanZoom } from "../composables/svg-pan-zoom"
import { provideZoomLevel } from "../composables/zoom"
import { EventHandler, Layouts, Nodes, Edges, UserLayouts, Layers } from "../common/types"
import { Reactive, nonNull } from "../common/common"
import { UserConfigs } from "../common/configs"
import VNode from "./node.vue"
import VNodeFocusRing from "./node-focus-ring.vue"
import VEdgeGroups from "./edge-groups.vue"

export default defineComponent({
  components: { VNode, VNodeFocusRing, VEdgeGroups },
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
    layers: {
      type: Object as PropType<Layers>,
      default: () => ({}),
    },
    eventHandler: {
      // 多量のイベントが発行されるため、開発ツールのイベントログを汚さないよう
      // 指定した関数にイベントを流しこむ設計とする.
      type: Function as PropType<EventHandler>,
      default: () => (_e: any, _v: any) => {},
    },
  },
  emits: [
    "update:zoomLevel",
    "update:maxZoomLevel",
    "update:selectedNodes",
    "update:selectedEdges",
    "update:layouts",
  ],
  setup(props, { emit }) {
    // Event Bus
    const emitter = provideEventEmitter()
    emitter.on("*", (type, event) => props.eventHandler(type, event))

    // Style settings
    const configs = provideConfigs(props.configs)

    // Background layers
    const backgroundLayers = computed(() => {
      return Object.entries(props.layers)
        .filter(([_, type]) => type === "background")
        .map(([name, _]) => name)
    })

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

    watch(() => configs.view.panEnabled, v => {
      svgPanZoom.value?.setPanEnabled(v)
    })
    watch(() => configs.view.zoomEnabled, v => {
      svgPanZoom.value?.setZoomEnabled(v)
    })

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

    // 中心位置や拡大率の認識がずれることがあるための対処
    const updateBorderBox = (callback: () => void) => {
      svgPanZoom.value?.updateBBox()
      nextTick(callback)
    }

    // SVG 領域にコンテンツの内容がfitするように拡大・縮小する
    const fitToContents = () => {
      updateBorderBox(() => {
        svgPanZoom.value?.fitToContents()
        emitter.emit("view:fit", undefined)
      })
    }

    // SVG 領域の中央にコンテンツを配置する
    const panToCenter = () => {
      updateBorderBox(() => {
        svgPanZoom.value?.center()
      })
    }

    const zoomIn = () => { svgPanZoom.value?.zoomIn() }
    const zoomOut = () => { svgPanZoom.value?.zoomOut() }

    const getAsSvg = () => {
      const element = svg.value
      const viewport = element?.querySelector(".v-viewport") as SVGGElement
      if (!element || !viewport) return

      const target = document.createElement("svg")
      target.setAttribute("xmlns", "http://www.w3.org/2000/svg")

      const box = viewport.getBBox()
      target.setAttribute("width", box.width.toString())
      target.setAttribute("height", box.height.toString())

      const v = viewport.cloneNode(true) as SVGGElement
      v.setAttribute("transform", `translate(${-box.x}, ${-box.y})`)
      v.removeAttribute("style")
      target.appendChild(v)

      target.setAttribute("viewBox", `0 0 ${box.width} ${box.height}`)
      return target.outerHTML
    }

    // -----------------------------------------------------------------------
    // States of selected nodes/edges
    // -----------------------------------------------------------------------
    const currentSelectedNodes = bindPropKeySet(props, "selectedNodes", props.nodes, emit)
    watch(currentSelectedNodes, nodes => emitter.emit("node:select", Array.from(nodes)))

    const currentSelectedEdges = bindPropKeySet(props, "selectedEdges", props.edges, emit)
    watch(currentSelectedEdges, edges => emitter.emit("edge:select", Array.from(edges)))

    const currentLayouts = reactive<Layouts>({ nodes: {} })

    // two-way binding
    watch(
      () => props.layouts,
      () => Object.assign(currentLayouts, props.layouts),
      { deep: true, immediate: true }
    )
    watch(currentLayouts, () => emit("update:layouts", currentLayouts), { deep: true })

    // handle increase/decrease nodes
    watch(
      () => new Set(Object.keys(props.nodes)),
      nodeIdSet => {
        // remove node positions that not found in nodes
        const positions = currentLayouts.nodes
        const removed = Object.keys(positions).filter(n => !nodeIdSet.has(n))
        for (const node of removed) {
          delete positions[node]
        }
        // remove nodes in selected nodes
        currentSelectedNodes.forEach(n => {
          if (!nodeIdSet.has(n)) {
            currentSelectedNodes.delete(n)
          }
        })
      }
    )

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

    provideMouseOperation(
      svg,
      readonly(currentLayouts.nodes),
      readonly(zoomLevel),
      readonly(configs),
      currentSelectedNodes,
      currentSelectedEdges,
      emitter
    )

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
        // (calc the positions of nodes whose positions atr not specified)
        configs.view.layoutHandler.activate(activateParams())

        nextTick(() => {
          // The center may change as a result of the position calculation above,
          // so re-center.
          panToCenter()

          // start displaying the svg
          show.value = true
        })
      })
    })

    onSvgPanZoomUnmounted(
      () => configs.view.layoutHandler.deactivate()
    )

    return {
      // html ref
      container,
      svg,
      show,

      // properties
      backgroundLayers,
      currentSelectedNodes,
      currentSelectedEdges,
      dragging,
      currentLayouts,
      visibleNodeFocusRing,

      // methods
      fitToContents,
      panToCenter,
      zoomIn,
      zoomOut,
      getAsSvg,
    }
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
svg.v-canvas {
  width: 100%;
  height: 100%;
  // svgPanZoomライブラリが有効になるまでの乱れへの対応
  opacity: 0;
  transition: opacity 0.5s linear;
  &.show {
    opacity: 1;
  }
}

svg.dragging,
svg.dragging * {
  cursor: grabbing !important;
}
</style>
