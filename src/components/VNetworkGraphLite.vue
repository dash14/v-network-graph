<script setup lang="ts">
import { computed } from "vue"
import { getLiteConfigDefaults } from "@/common/config-defaults"
import { LiteUserConfigs, UserConfigs } from "@/common/configs"
import { EventHandlers, Nodes, Edges, Layouts, UserLayouts, Layers } from "@/common/types"
import { useGraph } from "@/composables/graph"
import { GRAPH_SYSTEM_SLOTS, LayerSlotProps } from "@/composables/layer"
import VBackgroundGrid from "./background/VBackgroundGrid.vue"
import VBackgroundViewport from "./background/VBackgroundViewport.vue"
import VSelectionBox from "./base/VSelectionBox.vue"
import VLiteEdgesLayer from "./lite/VLiteEdgesLayer.vue"
import VLiteNodeLabelsLayer from "./lite/VLiteNodeLabelsLayer.vue"
import VLiteNodesLayer from "./lite/VLiteNodesLayer.vue"
import VMarkerHead from "./marker/VMarkerHead.vue"

const BUILT_IN_LAYERS = ["edges", "nodes", "node-labels"] as const

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

// A lite graph forces edge.type to straight and summarize off, whatever the configs say.
const userConfigs = computed<UserConfigs>(() => ({
  ...(props.configs as UserConfigs),
  edge: { ...props.configs.edge, type: "straight", summarize: false },
}))

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
  getLayouts,
  methods,
} = useGraph(props, emit, {
  configs: userConfigs,
  defaultConfigs: getLiteConfigDefaults,
  slots,
  builtInLayers: BUILT_IN_LAYERS,
  layoutsUpdateInterval: configs => configs.view.layoutsUpdateInterval,
})
const { container, svg, viewport, show, scale } = canvas

defineExpose({
  getLayouts,
  ...methods,
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
