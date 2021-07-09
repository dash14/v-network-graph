<template>
  <div
    ref="container"
    class="nt-canvas"
  >
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
            <slot
              v-for="layerName in backgroundLayers"
              :key="layerName"
              :name="layerName"
            >
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
            <template
              v-for="(link, id, i) in bundledLinks"
              v-else
              :key="`${id}`"
            >
              <nt-link
                :source-id="link.source"
                :target-id="link.target"
                :source-node="nodes[link.source]"
                :target-node="nodes[link.target]"
                :source-pos="currentLayouts.nodes[link.source]"
                :target-pos="currentLayouts.nodes[link.target]"
                :i="i"
                :count="Object.keys(bundledLinks).length"
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
import { computed, defineComponent, nextTick, onMounted, onUnmounted, PropType, reactive, readonly, Ref, ref, toRef, watch } from "vue"
import isEqual from "lodash-es/isEqual"
import NtNode from "./objects/nt-node.vue"
import NtNodeSelection from "./objects/nt-node-selection.vue"
import NtLink from "./objects/nt-link.vue"
import NtSummarizedLink from "./objects/nt-summarized-link.vue"
import { provideStyles } from "./composables/style"
import { provideMouseOperation } from "./composables/mouse"
import { provideEventEmitter } from "./composables/event-emitter"
import { useSvgPanZoom } from "./composables/svg-pan-zoom"
import { provideZoomLevel } from "./composables/zoom"
import { EventHandler, Layouts, Links, MouseMode, nonNull, NtLayerPos, Styles, UserLayouts, UserStyles } from "./common/types"
import type { Nodes } from "./common/types"
import { SimpleLayout } from "./layouts/simple"
import { LayoutHandler } from "./layouts/handler"

function propBoundRef<T, K extends keyof T>(
    props: T,
    name: K,
    emit: any,
    // filter?: (arg: T[K]) => T[K]
  ) : Ref<T[K]> {
  // 必ずpropsで渡されるとは限らない(emitしても書き換わらない)ため、
  // 自身での管理用に常にrefを保持する

  // if (filter) {
  //   // writable computed を使用する案もあるが、Vue 3 では
  //   // 配列の要素変更が通知されない挙動があるため避ける.
  //   const prop = ref<T[K]>(filter(props[name])) as Ref<T[K]>
  //   watch(() => props[name], v => {
  //     const filtered = filter(v)
  //     if (!isEqual(filtered, prop.value)) {
  //       prop.value = filtered
  //     }
  //   })
  //   watch(prop, v => {
  //     const filtered = filter(v)
  //     if (!isEqual(filtered, props[name])) {
  //       emit(`update:${name}`, filtered)
  //     }
  //   })
  //   return prop

  // } else {
  const prop = ref<T[K]>(props[name]) as Ref<T[K]>
  watch(() => props[name], v => {
    if (!isEqual(v, prop.value)) {
      prop.value = v
    }
  })
  watch(prop, v => {
    if (!isEqual(v, props[name])) {
      emit(`update:${name}`, v)
    }
  })
  return prop
}


export default defineComponent({
  name: "NtTopology",
  components: { NtNode, NtNodeSelection, NtLink, NtSummarizedLink },
  props: {
    layers: {
      type: Object as PropType<{[name: string]: string}>,
      default: () => ({})
    },
    zoomLevel: {
      type: Number,
      default: 1
    },
    maxZoomLevel: {
      type: Number,
      default: 16
    },
    mouseMode: {
      type: String as PropType<MouseMode | string>,
      default: MouseMode.NORMAL
    },
    nodes: {
      type: Object as PropType<Nodes>,
      default: () => ({})
    },
    links: {
      type: Object as PropType<Links>,
      default: () => ({})
    },
    selectedNodes: {
      type: Array as PropType<string[]>,
      default: () => []
    },
    layouts: {
      type: Object as PropType<UserLayouts>,
      default: () => ({})
    },
    layoutHandler: {
      type: Object as PropType<LayoutHandler>,
      default: () => new SimpleLayout()
    },
    styles: {
      type: Object as PropType<UserStyles>,
      default: () => ({})
    },
    eventHandler: {
      // 多量のイベントが発行されるため、開発ツールのイベントログを汚さないよう
      // 指定した関数にイベントを流しこむ設計とする.
      type: Function as PropType<EventHandler>,
      default: () => ((_e: any, _v: any) => {})
    }
  },
  emits: [
    "update:zoomLevel", "update:maxZoomLevel",
    "update:mouseMode", "update:selectedNodes",
    "update:layouts",
  ],
  setup(props, { emit }) {
    const backgroundLayers = computed(() => {
      return Object.entries(props.layers).filter(v => v[1] == NtLayerPos.BACKGROUND).map(v => v[0])
    })

    // -----------------------------------------------------------------------
    // 初期化処理
    // -----------------------------------------------------------------------

    const { emitter } = provideEventEmitter()

    // -----------------------------------------------------------------------
    // SVG領域
    // -----------------------------------------------------------------------
    const container = ref<HTMLDivElement>()
    const svg = ref<SVGElement>()
    const show = ref<boolean>(false)

    const zoomLevel = propBoundRef(props, "zoomLevel", emit)
    const resizeObserver = new ResizeObserver(() => {
      svgPanZoom.value?.resize()
    })
    const getOriginalZoom = () => {
      const z = svgPanZoom.value?.getSizes().realZoom ?? 1
      const relativeZoom = svgPanZoom.value?.getZoom() ?? 1
      return z / relativeZoom
    }

    // SVG の pan / zoom
    const { svgPanZoom } = useSvgPanZoom(svg, {
        viewportSelector: ".nt-viewport",
        minZoom: 0.1,
        maxZoom: props.maxZoomLevel,
        fit: true,
        center: true,
        onZoom: _ => {
          zoomLevel.value = svgPanZoom.value?.getSizes().realZoom ?? 1
          emitter.emit("view:zoom", zoomLevel.value)
        },
        onPan: p => emitter.emit("view:pan", p),
        customEventsHandler: {
          init: () => resizeObserver.observe(container.value as HTMLDivElement),
          haltEventListeners: [],
          destroy: () => resizeObserver.disconnect()
        }
    })

    const applyZoomByAbsoluteZoom = (absoluteZoomLevel: number) => {
      const org = getOriginalZoom()
      svgPanZoom.value?.setMinZoom(0.1 / org)
                      .setMaxZoom(props.maxZoomLevel / org)
                      .zoom(absoluteZoomLevel / org)
    }

    onMounted(() => {
      const initialZoomLevel = props.zoomLevel
      // zoom初期値の反映
      applyZoomByAbsoluteZoom(initialZoomLevel)
      center()
    })

    watch(zoomLevel, value => {
      applyZoomByAbsoluteZoom(value)
    })

    const maxZoomLevel = propBoundRef(props, "maxZoomLevel", emit)
    watch(maxZoomLevel, value => svgPanZoom.value?.setMaxZoom(value))

    // 中心位置や拡大率の認識がずれることがあるため
    const updateBorderBox = (callback: () => void) => {
      svgPanZoom.value?.updateBBox()
      nextTick(() => {
        callback()
      })
    }

    // SVG 領域にコンテンツの内容がfitするように拡大・縮小する
    const fitToContents = () => {
      updateBorderBox(() => {
        svgPanZoom.value?.fitToContents()
        emitter.emit("view:fit", undefined)
      })
    }

    // SVG 領域の中央にコンテンツを配置する
    const center = () => {
      updateBorderBox(() => {
        svgPanZoom.value?.center()
      })
    }

    // -----------------------------------------------------------------------
    // 表示スタイル
    // -----------------------------------------------------------------------
    const styles = provideStyles(props.styles)

    // -----------------------------------------------------------------------
    // ズームレベル/縮尺値
    // -----------------------------------------------------------------------
    const { scale } = provideZoomLevel(zoomLevel, styles.view)

    // -----------------------------------------------------------------------
    // リンク
    // -----------------------------------------------------------------------
    // リンクの配置用中間マップの生成
    const linkMap = computed(() => {
      const map = new Map<string, Links>()
      for (const [id, link] of Object.entries(props.links)) {
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
    // ノード座標
    // -----------------------------------------------------------------------
    const currentLayouts = reactive<Layouts>({ nodes: {} })
    Object.assign(currentLayouts, props.layouts)
    watch(() => props.layouts, () => Object.assign(currentLayouts, props.layouts), { deep: true })
    watch(currentLayouts, () => emit("update:layouts", currentLayouts), { deep: true })
    watch(
      () => new Set(Object.keys(props.nodes)),
      (nodeIdSet) => {
        // remove a node position that not found in nodes
        const positions = currentLayouts.nodes
        const removed = Object.keys(positions).filter(n => !nodeIdSet.has(n))
        for (const node of removed) {
          delete positions[node]
        }
      }
    )

    // -----------------------------------------------------------------------
    // ノード選択
    // -----------------------------------------------------------------------
    const nodeIdExistenceFilter = (n: string) => n in props.nodes
    const currentSelectedNodes = reactive<string[]>([])
    const updateSelectNodes = (source: string[]) => {
      const filtered = source.filter(nodeIdExistenceFilter)
      if (!isEqual(filtered, currentSelectedNodes)) {
        currentSelectedNodes.splice(0, currentSelectedNodes.length, ...filtered)
      }
    }
    watch(() => props.selectedNodes, v => updateSelectNodes(v), { immediate: true })
    watch(() => props.nodes, () => updateSelectNodes(currentSelectedNodes))
    watch(currentSelectedNodes, () => {
      emit("update:selectedNodes", currentSelectedNodes)
      emitter.emit("node:select", currentSelectedNodes)
    })
    // - ドラッグ時のポインター変更
    const dragging = ref<boolean>(false)
    emitter.on("node:dragstart", _ => (dragging.value = true))
    emitter.on("node:dragend", _ => (dragging.value = false))

    provideMouseOperation(
      svg, readonly(currentLayouts.nodes), zoomLevel,
      toRef(styles.node, "selectable"), currentSelectedNodes, emitter
    )

    // -----------------------------------------------------------------------
    // ノードレイアウト
    // -----------------------------------------------------------------------

    const activateParams = () => ({
      layouts: currentLayouts.nodes,
      nodes: props.nodes,
      links: props.links,
      styles,
      emitter,
      scale,
      svgPanZoom: nonNull(svgPanZoom.value),
    })
    onMounted(() => props.layoutHandler.activate(activateParams()))
    onUnmounted(() => props.layoutHandler.deactivate())
    watch(() => props.layoutHandler, (newHandler, oldHandler) => {
      oldHandler.deactivate()
      newHandler.activate(activateParams())
    })

    // -----------------------------------------------------------------------
    // Events
    // -----------------------------------------------------------------------

    emitter.on("*", (type, event) => props.eventHandler(type, event))

    // Selection Layer:
    // - selection
    // - normal


    const currentMouseMode = propBoundRef(props, "mouseMode", emit)

    onMounted(() => {
      // 表示直後のzoomレベルを通知する
      emit("update:zoomLevel", svgPanZoom.value?.getZoom())

      // svgの表示開始
      nextTick(() => show.value = true)

      // currentMouseMode.value = MouseMode.RANGE_SELECTION
    })

    return {
      container,
      svg,
      show,
      svgPanZoom,
      linkMap,
      checkLinkSummarize,
      backgroundLayers,

      // methods
      fitToContents,
      center,

      // properties
      currentMouseMode,
      currentSelectedNodes,
      dragging,

      // temporary
      currentLayouts,
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
