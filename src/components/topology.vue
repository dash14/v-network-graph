<template>
  <div ref="container" class="nt-canvas">
    <svg
      ref="svg"
      class="nt-canvas"
      :class="{ show, dragging }"
      width="500"
      height="500"
      viewBox="0 0 500 500"
    >
      <!-- outside of viewport -->

      <!-- viewport: pan/zoom の対象領域 -->
      <g class="nt-viewport">
        <!-- background -->
        <template v-if="backgroundLayers.length > 0">
          <g class="nt-layer-background">
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

        <!-- links -->
        <g class="nt-layer-links">
          <template v-for="[key, bundledLinks] in linkMap">
            <template v-if="checkLinkSummarize(bundledLinks)">
              <nt-summarized-link
                :key="key"
                :links="bundledLinks"
                :layouts="currentLayouts.nodes"
              />
            </template>
            <template v-for="(link, id, i) in bundledLinks" v-else :key="`${id}`">
              <nt-link
                :id="id.toString()"
                :source-id="link.source"
                :target-id="link.target"
                :source-node="nodes[link.source]"
                :target-node="nodes[link.target]"
                :source-pos="currentLayouts.nodes[link.source]"
                :target-pos="currentLayouts.nodes[link.target]"
                :i="i"
                :count="Object.keys(bundledLinks).length"
                :selected="currentSelectedLinks.includes(id.toString())"
              />
            </template>
          </template>
        </g>

        <!-- node selections -->
        <g class="nt-layer-nodes-selections">
          <nt-node-selection
            v-for="nodeId in currentSelectedNodes"
            :key="nodeId"
            :pos="currentLayouts.nodes[nodeId]"
          />
        </g>

        <!-- nodes -->
        <g class="nt-layer-nodes">
          <nt-node
            v-for="(node, nodeId) in nodes"
            :id="nodeId.toString()"
            :key="nodeId"
            :node="node"
            :pos="currentLayouts.nodes[nodeId]"
          />
          <text
            x="0"
            y="40"
            fill="black"
            font-size="10"
            text-anchor="start"
            dominant-baseline="text-before-edge"
          >
            Nodes
          </text>
        </g>

        <!-- node range selections -->

        <!-- link labels -->

        <!-- node labels -->

        <!-- paths -->
      </g>
    </svg>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, reactive, readonly, ref } from "vue"
import { computed, nextTick, onMounted, onUnmounted, watch } from "vue"
import isEqual from "lodash-es/isEqual"
import NtNode from "./objects/node.vue"
import NtNodeSelection from "./objects/node-selection.vue"
import NtLink from "./objects/link.vue"
import NtSummarizedLink from "./objects/summarized-link.vue"
import { bindProp, bindPropKeyArray } from "./common/props"
import { provideStyles } from "./composables/style"
import { provideMouseOperation } from "./composables/mouse"
import { provideEventEmitter } from "./composables/event-emitter"
import { useSvgPanZoom } from "./composables/svg-pan-zoom"
import { provideZoomLevel } from "./composables/zoom"
import { EventHandler, Layouts, Nodes, Links, NtLayerPos, UserLayouts } from "./common/types"
import { nonNull } from "./common/types"
import { Styles, UserStyles } from "./common/styles"
import { SimpleLayout } from "./layouts/simple"
import { LayoutHandler } from "./layouts/handler"

export default defineComponent({
  name: "NtTopology",
  components: { NtNode, NtNodeSelection, NtLink, NtSummarizedLink },
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
    links: {
      type: Object as PropType<Links>,
      default: () => ({}),
    },
    selectedNodes: {
      type: Array as PropType<string[]>,
      default: () => [],
    },
    selectedLinks: {
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
    styles: {
      type: Object as PropType<UserStyles>,
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
    "update:selectedLinks",
    "update:layouts",
  ],
  setup(props, { emit }) {
    // Event Bus
    const emitter = provideEventEmitter()
    emitter.on("*", (type, event) => props.eventHandler(type, event))

    // Style settings
    const styles = provideStyles(props.styles)

    // Background layers
    const backgroundLayers = computed(() => {
      return Object.entries(props.layers)
        .filter(([_, type]) => type == NtLayerPos.BACKGROUND)
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
    const resizeObserver = new ResizeObserver(() => {
      svgPanZoom.value?.resize()
    })

    // SVG pan / zoom
    const { svgPanZoom } = useSvgPanZoom(svg, {
      viewportSelector: ".nt-viewport",
      minZoom: props.minZoomLevel, // temporary
      maxZoom: props.maxZoomLevel, // temporary
      fit: true,
      center: true,
      preventMouseEventsDefault: false, // for event listen option: { passive: true }
      onZoom: _ => {
        const z = svgPanZoom.value?.getRealZoom() ?? 1
        if (Math.abs(zoomLevel.value - z) >= 1.0e-6) {
          zoomLevel.value = z
          emitter.emit("view:zoom", z)
        }
      },
      onPan: p => emitter.emit("view:pan", p),
      customEventsHandler: {
        init: () => resizeObserver.observe(nonNull(container.value)),
        haltEventListeners: [],
        destroy: () => resizeObserver.disconnect(),
      },
    })

    const applyAbsoluteZoomLevel = (absoluteZoomLevel: number) => {
      svgPanZoom.value?.applyAbsoluteZoomLevel(
        absoluteZoomLevel,
        props.minZoomLevel,
        props.maxZoomLevel
      )
    }

    watch(zoomLevel, v => applyAbsoluteZoomLevel(v))
    watch(
      () => [props.minZoomLevel, props.maxZoomLevel],
      _ => {
        applyAbsoluteZoomLevel(zoomLevel.value)
      }
    )

    // Provide zoom level / scaling parameter
    const { scale } = provideZoomLevel(zoomLevel, styles.view)

    onMounted(() => {
      // apply initial zoom level
      const initialZoomLevel = props.zoomLevel
      applyAbsoluteZoomLevel(initialZoomLevel)
      panToCenter()
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

    // -----------------------------------------------------------------------
    // Links
    // -----------------------------------------------------------------------

    // リンクの配置用中間マップの生成
    const linkMap = computed(() => {
      const map = new Map<string, Links>()
      for (const [id, link] of Object.entries(props.links)) {
        if (!(link.source in props.nodes && link.target in props.nodes)) {
          // reject if no node ID is found on the nodes
          continue
        }
        const key = [link.source, link.target].sort().join("<=>")
        const values = map.get(key) || {}
        values[id] = link
        map.set(key, values)
      }
      return map
    })
    const defaultCheckSummarize = (links: Links, styles: Styles) => {
      // link幅とgap幅がノードの大きさを超えていたら集約する
      const linkCount = Object.entries(links).length
      const width = styles.link.stroke.width * linkCount + styles.link.gap * (linkCount - 1)
      let minWidth = 0
      if (styles.node.shape.type === "circle") {
        minWidth = styles.node.shape.radius * 2
      } else {
        minWidth = Math.min(styles.node.shape.width, styles.node.shape.height)
      }
      return width > minWidth
    }
    const checkLinkSummarize = computed(() => {
      return (links: Links) => {
        return defaultCheckSummarize(links, styles)
      }
    })

    // -----------------------------------------------------------------------
    // States of selected nodes/links
    // -----------------------------------------------------------------------
    const currentSelectedNodes = bindPropKeyArray(props, "selectedNodes", props.nodes, emit)
    watch(currentSelectedNodes, nodes => emitter.emit("node:select", nodes))

    const currentSelectedLinks = bindPropKeyArray(props, "selectedLinks", props.links, emit)
    watch(currentSelectedLinks, links => emitter.emit("link:select", links))

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

    provideMouseOperation(
      svg,
      readonly(currentLayouts.nodes),
      readonly(zoomLevel),
      readonly(styles),
      currentSelectedNodes,
      currentSelectedLinks,
      emitter
    )

    // -----------------------------------------------------------------------
    // Node layout handler
    // -----------------------------------------------------------------------

    const activateParams = () => ({
      layouts: currentLayouts.nodes,
      nodes: readonly(props.nodes),
      links: readonly(props.links),
      styles: readonly(styles),
      scale: readonly(scale),
      emitter,
      svgPanZoom: nonNull(svgPanZoom.value),
    })
    onMounted(() => props.layoutHandler.activate(activateParams()))
    onUnmounted(() => props.layoutHandler.deactivate())
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

    const preventDefault = (event: MouseEvent) => event.preventDefault()

    onMounted(() => {
      // Prevent pinch-in/out zooming of the entire page.
      // The svg-pan-zoom's event listeners set the "passive: true" option
      // to improve drag performance.
      container.value?.addEventListener("wheel", preventDefault, { passive: false })

      // svgの表示開始
      nextTick(() => (show.value = true))
    })

    onUnmounted(() => {
      container.value?.removeEventListener("wheel", preventDefault)
    })

    return {
      // html ref
      container,
      svg,
      show,

      // properties
      linkMap,
      checkLinkSummarize,
      backgroundLayers,
      currentSelectedNodes,
      currentSelectedLinks,
      dragging,
      currentLayouts,

      // methods
      fitToContents,
      panToCenter,
    }
  },
})
</script>

<style lang="scss" scoped>
div.nt-canvas {
  padding: 0;
  position: relative;
  width: 100%;
  height: 100%;
}
svg.nt-canvas {
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
