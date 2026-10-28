<script setup lang="ts">
import { toRef, computed, CSSProperties } from "vue"
import { UserConfigs } from "@/common/configs"
import { EventHandlers, Nodes, Edges, InputPaths, Layouts, UserLayouts } from "@/common/types"
import { Layers } from "@/common/types"
import { useGraph } from "@/composables/graph"
import { LayerSlotProps } from "@/composables/layer"
import { useTranslatePathsToObject } from "@/composables/object"
import { useTransitionWhile } from "@/composables/transition"
import { bindPropKeySet } from "@/utils/props"
import VBackgroundGrid from "./background/VBackgroundGrid.vue"
import VBackgroundViewport from "./background/VBackgroundViewport.vue"
import VSelectionBox from "./base/VSelectionBox.vue"
import { EdgeLabelSlotProps } from "./edge/VEdgeLabelPlace.vue"
import { EdgeLabelsSlotProps } from "./edge/VEdgeLabelsPlace.vue"
import { EdgeOverlaySlotProps } from "./edge/VEdgeOverlay.vue"
import VEdgeLabelsLayer from "./layers/VEdgeLabelsLayer.vue"
import VEdgesLayer from "./layers/VEdgesLayer.vue"
import VFocusringLayer from "./layers/VFocusringLayer.vue"
import VNodeLabelsLayer from "./layers/VNodeLabelsLayer.vue"
import VNodesLayer from "./layers/VNodesLayer.vue"
import VPathsLayer from "./layers/VPathsLayer.vue"
import VMarkerHead from "./marker/VMarkerHead.vue"
import { NodeSlotProps } from "./node/VNode.vue"
import { NodeLabelSlotProps } from "./node/VNodeLabel.vue"

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
  (e: "update:layouts", v: Layouts): void
  (e: "update:selectedNodes", v: string[]): void
  (e: "update:selectedEdges", v: string[]): void
  (e: "update:selectedPaths", v: string[]): void
}>()

const slots = defineSlots<
  {
    default: (props: LayerSlotProps) => any
    "override-node": (props: NodeSlotProps) => any
    "override-node-label": (props: NodeLabelSlotProps) => any
    "edge-overlay": (props: EdgeOverlaySlotProps) => any
    "edge-label": (props: EdgeLabelSlotProps) => any
    "edges-label": (props: EdgeLabelsSlotProps) => any
  } & {
    [key: string]: (props: LayerSlotProps) => any
  }
>()

const { objects: pathsRef, isInCompatibilityModeForPath } = useTranslatePathsToObject(
  toRef(props, "paths")
)

const {
  configs,
  layerDefs,
  isShowGrid,
  isShowBackgroundViewport,
  builtInLayerOrder,
  canvas,
  markerState,
  dragging,
  touches,
  isBoxSelectionMode,
  selectionBox,
  view,
  methods,
} = useGraph(props, emit, {
  configs: toRef(props, "configs"),
  slots,
  paths: {
    objects: pathsRef,
    isInCompatibilityMode: isInCompatibilityModeForPath,
    bindSelected: () => bindPropKeySet(props, "selectedPaths", pathsRef, emit),
  },
})
const { container, svg, viewport, show, scale } = canvas

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

defineExpose({
  ...methods,
  transitionWhile,
  getAsSvg: view.getAsSvg,
})
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
            <v-edges-layer :edge-overlay="slots['edge-overlay']" />
          </template>

          <!-- Edge labels -->
          <template v-else-if="layerName === 'edge-labels'">
            <v-edge-labels-layer
              :edge-label="slots['edge-label']"
              :edges-label="slots['edges-label']"
            />
          </template>

          <!-- Node focusring -->
          <template v-else-if="layerName === 'focusring'">
            <v-focusring-layer />
          </template>

          <!-- Nodes -->
          <template v-else-if="layerName === 'nodes'">
            <v-nodes-layer :override-node="slots['override-node']" />
          </template>

          <!-- Node labels -->
          <template v-else-if="layerName === 'node-labels'">
            <v-node-labels-layer :override-node-label="slots['override-node-label']" />
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

// Disable transitions before initialization is completed
.v-ng-canvas:not(.show) {
  .v-ng-node,
  .v-ng-node-label,
  .v-ng-node-focusring,
  .v-ng-edge,
  .v-ng-edge-label,
  .v-ng-path {
    transition: none;
    > * {
      transition: none;
    }
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
