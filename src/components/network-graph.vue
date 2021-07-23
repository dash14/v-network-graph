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
          <template v-for="[key, bundledEdges] in Array.from(edgeMap)">
            <template v-if="checkEdgeSummarize(bundledEdges)">
              <v-summarized-edge :key="key" :edges="bundledEdges" :layouts="currentLayouts.nodes" />
            </template>
            <template v-for="(edge, id, i) in bundledEdges" v-else :key="`${id}`">
              <v-edge
                :id="id.toString()"
                :source-id="edge.source"
                :target-id="edge.target"
                :source-node="nodes[edge.source]"
                :target-node="nodes[edge.target]"
                :source-pos="currentLayouts.nodes[edge.source]"
                :target-pos="currentLayouts.nodes[edge.target]"
                :i="i"
                :count="Object.keys(bundledEdges).length"
                :selected="currentSelectedEdges.includes(id.toString())"
              />
            </template>
          </template>
        </g>

        <!-- node selections -->
        <g v-if="configs.node?.selectable" class="v-layer-nodes-selections">
          <v-node-selection
            v-for="nodeId in currentSelectedNodes"
            :key="nodeId"
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
          />
        </g>

        <!-- node range selections -->

        <!-- edge labels -->

        <!-- node labels -->

        <!-- paths -->
      </g>
    </svg>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, reactive, readonly, ref } from "vue"
import { computed, nextTick, watch } from "vue"
import isEqual from "lodash-es/isEqual"
import { bindProp, bindPropKeyArray } from "../common/props"
import { provideConfigs } from "../composables/style"
import { provideMouseOperation } from "../composables/mouse"
import { provideEventEmitter } from "../composables/event-emitter"
import { useSvgPanZoom } from "../composables/svg-pan-zoom"
import { provideZoomLevel } from "../composables/zoom"
import { EventHandler, Layouts, Nodes, Edges, LayerPos, UserLayouts } from "../common/types"
import { Reactive, nonNull } from "../common/types"
import { Configs, UserConfigs } from "../common/configs"
import { SimpleLayout } from "../layouts/simple"
import { LayoutHandler } from "../layouts/handler"
import VNode from "./node.vue"
import VNodeSelection from "./node-selection.vue"
import VEdge from "./edge.vue"
import VSummarizedEdge from "./summarized-edge.vue"

export default defineComponent({
  components: { VNode, VNodeSelection, VEdge, VSummarizedEdge },
  props: {
    layers: {
      type: Object as PropType<{ [name: string]: string }>,
      default: () => ({}),
    },
    zoomLevel: {
      type: Number,
      default: 1,
    },
    minZoomLevel: {
      type: Number,
      default: 0.1,
    },
    maxZoomLevel: {
      type: Number,
      default: 16,
    },
    nodes: {
      type: Object as PropType<Nodes>,
      default: () => ({}),
    },
    edges: {
      type: Object as PropType<Edges>,
      default: () => ({}),
    },
    selectedNodes: {
      type: Array as PropType<string[]>,
      default: () => [],
    },
    selectedEdges: {
      type: Array as PropType<string[]>,
      default: () => [],
    },
    layouts: {
      type: Object as PropType<UserLayouts>,
      default: () => ({}),
    },
    layoutHandler: {
      type: Object as PropType<LayoutHandler>,
      default: () => new SimpleLayout(),
    },
    configs: {
      type: Object as PropType<UserConfigs>,
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
        .filter(([_, type]) => type == LayerPos.BACKGROUND)
        .map(([name, _]) => name)
    })

    // -----------------------------------------------------------------------
    // SVG
    // -----------------------------------------------------------------------
    const container = ref<HTMLDivElement>()
    const svg = ref<SVGElement>()
    const show = ref<boolean>(false)

    const zoomLevel = bindProp(props, "zoomLevel", emit, v => {
      if (v < props.minZoomLevel) return props.minZoomLevel
      if (v > props.maxZoomLevel) return props.maxZoomLevel
      return v
    })

    // SVG pan / zoom
    const { svgPanZoom, onSvgPanZoomMounted, onSvgPanZoomUnmounted } = useSvgPanZoom(svg, {
      viewportSelector: ".v-viewport",
      minZoom: props.minZoomLevel, // temporary
      maxZoom: props.maxZoomLevel, // temporary
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
    const resizeObserver = new ResizeObserver(() => {
      svgPanZoom.value?.resize()
    })
    onSvgPanZoomMounted(() => {
      resizeObserver.observe(nonNull(container.value, "svg-pan-zoom container"))
    })
    onSvgPanZoomUnmounted(() => {
      resizeObserver.disconnect()
    })

    const applyAbsoluteZoomLevel = (absoluteZoomLevel: number) => {
      svgPanZoom.value?.applyAbsoluteZoomLevel(
        absoluteZoomLevel,
        props.minZoomLevel,
        props.maxZoomLevel
      )
    }

    watch(() => configs.view.panEnabled, v => {
      if (v) svgPanZoom.value?.enablePan()
      else svgPanZoom.value?.disablePan()
    })
    watch(() => configs.view.zoomEnabled, v => {
      if (v) svgPanZoom.value?.enableZoom()
      else svgPanZoom.value?.disableZoom()
    })

    watch(zoomLevel, v => applyAbsoluteZoomLevel(v))
    watch(
      () => [props.minZoomLevel, props.maxZoomLevel],
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

    // -----------------------------------------------------------------------
    // Edges
    // -----------------------------------------------------------------------

    // リンクの配置用中間マップの生成
    const edgeMap = computed(() => {
      const map = new Map<string, Edges>()
      for (const [id, edge] of Object.entries(props.edges)) {
        if (!(edge.source in props.nodes && edge.target in props.nodes)) {
          // reject if no node ID is found on the nodes
          continue
        }
        const key = [edge.source, edge.target].sort().join("<=>")
        const values = map.get(key) || {}
        values[id] = edge
        map.set(key, values)
      }
      return map
    })
    const defaultCheckSummarize = (edges: Edges, configs: Configs) => {
      // edge幅とgap幅がノードの大きさを超えていたら集約する
      const edgeCount = Object.entries(edges).length
      const width = configs.edge.stroke.width * edgeCount + configs.edge.gap * (edgeCount - 1)
      let minWidth = 0
      if (configs.node.shape.type === "circle") {
        minWidth = configs.node.shape.radius * 2
      } else {
        minWidth = Math.min(configs.node.shape.width, configs.node.shape.height)
      }
      return width > minWidth
    }
    const checkEdgeSummarize = computed(() => {
      return (edges: Edges) => {
        return defaultCheckSummarize(edges, configs)
      }
    })

    // -----------------------------------------------------------------------
    // States of selected nodes/edges
    // -----------------------------------------------------------------------
    const currentSelectedNodes = bindPropKeyArray(props, "selectedNodes", props.nodes, emit)
    watch(currentSelectedNodes, nodes => emitter.emit("node:select", nodes))

    const currentSelectedEdges = bindPropKeyArray(props, "selectedEdges", props.edges, emit)
    watch(currentSelectedEdges, edges => emitter.emit("edge:select", edges))

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
        const filtered = currentSelectedNodes.filter(n => nodeIdSet.has(n))
        if (!isEqual(filtered, currentSelectedNodes)) {
          currentSelectedNodes.splice(0, currentSelectedNodes.length, ...filtered)
        }
      }
    )

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
    onSvgPanZoomMounted(() => props.layoutHandler.activate(activateParams()))
    onSvgPanZoomUnmounted(() => props.layoutHandler.deactivate())
    watch(
      () => props.layoutHandler,
      (newHandler, oldHandler) => {
        oldHandler.deactivate()
        newHandler.activate(activateParams())
      }
    )

    // -----------------------------------------------------------------------
    // Events
    // -----------------------------------------------------------------------

    onSvgPanZoomMounted(() => {
      nextTick(() => {
        // 中央に表示
        panToCenter()

        // svgの表示開始
        show.value = true
      })
    })

    return {
      // html ref
      container,
      svg,
      show,

      // properties
      edgeMap,
      checkEdgeSummarize,
      backgroundLayers,
      currentSelectedNodes,
      currentSelectedEdges,
      dragging,
      currentLayouts,

      // methods
      fitToContents,
      panToCenter,
      zoomIn,
      zoomOut,
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
