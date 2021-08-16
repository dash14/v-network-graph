<template>
  <div class="network-graph-sample">
    <div class="control-box">
      <h4>Control</h4>
      <div class="controls">
        <div class="control slider">
          <label for="zoomLevel">Zoom Level</label>
          <input
            id="zoomLevel"
            v-model.number="zoomLevel"
            type="range"
            :min="configs.view.minZoomLevel"
            :max="configs.view.maxZoomLevel"
            step="0.1"
          >
          <div class="value">{{ zoomLevel.toFixed(1) }}</div>
        </div>
        <div class="control slider">
          <label for="minZoomLevel">Min Zoom</label>
          <input
            id="minZoomLevel"
            v-model.number="configs.view.minZoomLevel"
            type="range"
            min="0.1"
            :max="configs.view.maxZoomLevel"
            step="0.1"
          >
          <div class="value">{{ configs.view.minZoomLevel.toFixed(1) }}</div>
        </div>
        <div class="control slider">
          <label for="maxZoomLevel">Max Zoom</label>
          <input
            id="maxZoomLevel"
            v-model.number="configs.view.maxZoomLevel"
            type="range"
            :min="configs.view.minZoomLevel > 5 ? configs.view.minZoomLevel : 5"
            max="32"
            step="0.1"
          >
          <div class="value">{{ configs.view.maxZoomLevel.toFixed(1) }}</div>
        </div>
        <div class="control button">
          <label>Fit to objects</label>
          <div class="action">
            <button @click="fitToContents">Run</button>
          </div>
        </div>
        <div class="control button">
          <label>Zoom</label>
          <div class="action">
            <button @click="zoomIn">In</button>
            <button @click="zoomOut">Out</button>
          </div>
        </div>
        <div class="control button">
          <label>Pan to</label>
          <div class="action">
            <button @click="center">center</button>
            <button @click="panToZero">(0, 0)</button>
          </div>
        </div>
        <div class="control button">
          <label>Pan by</label>
          <div class="action">
            <button @click="panBy">(10, 10)</button>
          </div>
        </div>
        <div class="control button">
          <label>Get (console)</label>
          <div class="action">
            <button @click="getPan">pan</button>
            <button @click="getSizes">sizes</button>
          </div>
        </div>
        <div class="control button">
          <label>Download SVG</label>
          <div class="action">
            <button @click="downloadAsSvg">Run</button>
          </div>
        </div>
      </div>
      <h4>Configs</h4>

      <h5>View</h5>
      <div class="controls">
        <div class="control">
          <input id="viewScalingObjects" v-model="configs.view.scalingObjects" type="checkbox">
          <label for="viewScalingObjects">Scaling objects</label>
        </div>
        <div class="control">
          <input id="viewPanEnabled" v-model="configs.view.panEnabled" type="checkbox">
          <label for="viewPanEnabled">Pan Enabled</label>
        </div>
        <div class="control">
          <input id="viewZoomEnabled" v-model="configs.view.zoomEnabled" type="checkbox">
          <label for="viewZoomEnabled">Zoom Enabled</label>
        </div>
      </div>

      <h5>Node</h5>
      <div class="controls">
        <div class="control button">
          <label>Add/Remove</label>
          <div class="action">
            <button @click="addNode">Add</button>
            <button :disabled="selectedNodes.length == 0" @click="removeNode">Remove</button>
          </div>
        </div>
        <div v-if="configs.node.normal.type === 'circle'" class="control slider">
          <label for="nodeSize">Size</label>
          <input
            id="nodeSize"
            v-model.number="configs.node.normal.radius"
            type="range"
            min="1"
            max="64"
            step="1"
          >
          <div class="value">{{ configs.node.normal.radius }}</div>
        </div>
        <div class="control color">
          <label for="nodeColor">Color</label>
          <input id="nodeColor" v-model="configs.node.normal.color" type="color">
          <div class="value">
            <input v-model="configs.node.normal.color" type="input">
          </div>
        </div>
        <div class="control slider">
          <label for="nodeStrokeWidth">Stroke Width</label>
          <input
            id="nodeStrokeWidth"
            v-model.number="configs.node.normal.strokeWidth"
            type="range"
            min="1"
            max="32"
            step="1"
          >
          <div class="value">{{ configs.node.normal.strokeWidth }}</div>
        </div>
        <div class="control color">
          <label for="nodeStrokeColor">Stroke Color</label>
          <input id="nodeStrokeColor" v-model="configs.node.normal.strokeColor" type="color">
          <div class="value">
            <input v-model="configs.node.normal.strokeColor" type="input">
          </div>
        </div>
        <div class="control text">
          <label for="nodeStrokeDasharray">Dasharray</label>
          <div class="value">
            <input
              id="nodeStrokeDasharray"
              v-model="configs.node.normal.strokeDasharray"
              type="text"
            >
          </div>
        </div>
        <div class="control">
          <input id="nodeSelectable" v-model="configs.node.selectable" type="checkbox">
          <label for="nodeSelectable">Selectable</label>
        </div>
        <div>
          <label>Selected Nodes:</label>
          <ul>
            <li v-for="n in selectedNodes" :key="n">{{ n }}</li>
          </ul>
        </div>
      </div>
      <h5>Node Label</h5>
      <div class="controls">
        <div class="control">
          <input id="nodeLabelShow" v-model="configs.node.label.visible" type="checkbox">
          <label for="nodeLabelShow">Show</label>
        </div>
        <div class="control slider">
          <label for="nodeFontSize">Font Size</label>
          <input
            id="nodeFontSize"
            v-model.number="configs.node.label.fontSize"
            type="range"
            min="1"
            max="32"
            step="1"
          >
          <div class="value">{{ configs.node.label.fontSize }}</div>
        </div>
        <div class="control slider">
          <label for="nodeLabelMargin">Margin</label>
          <input
            id="nodeLabelMargin"
            v-model.number="configs.node.label.margin"
            type="range"
            min="0"
            max="24"
            step="1"
          >
          <div class="value">{{ configs.node.label.margin }}</div>
        </div>
        <div class="control color">
          <label for="nodeLabelColor">Color</label>
          <input id="nodeLabelColor" v-model="configs.node.label.color" type="color">
          <div class="value">
            <input v-model="configs.node.label.color" type="input">
          </div>
        </div>
        <div class="control select">
          <label for="nodeLabelDirection">Direction</label>
          <div class="value">
            <select id="nodeLabelDirection" v-model.number="configs.node.label.direction">
              <option value="0">C</option>
              <option value="1">N</option>
              <option value="2">NE</option>
              <option value="3">E</option>
              <option value="4">SE</option>
              <option value="5">S</option>
              <option value="6">SW</option>
              <option value="7">W</option>
              <option value="">NW</option>
            </select>
          </div>
        </div>
      </div>
      <h5>Node Focus Ring</h5>
      <div class="controls">
        <div class="control">
          <input
            id="nodeFocusRingVisible"
            v-model="configs.node.focusring.visible"
            type="checkbox"
          >
          <label for="nodeFocusRingVisible">Visible</label>
        </div>
        <div class="control slider">
          <label for="nodeFocusRingSize">Border Size</label>
          <input
            id="nodeFocusRingSize"
            v-model.number="configs.node.focusring.width"
            type="range"
            min="1"
            max="32"
            step="1"
          >
          <div class="value">{{ configs.node.focusring.width }}</div>
        </div>
        <div class="control slider">
          <label for="nodeFocusRingPadding">Padding</label>
          <input
            id="nodeFocusRingPadding"
            v-model.number="configs.node.focusring.padding"
            type="range"
            min="0"
            max="24"
            step="1"
          >
          <div class="value">{{ configs.node.focusring.padding }}</div>
        </div>
        <div class="control color">
          <label for="nodeFocusRingColor">Color</label>
          <input id="nodeFocusRingColor" v-model="configs.node.focusring.color" type="color">
          <div class="value">
            <input v-model="configs.node.focusring.color" type="input">
          </div>
        </div>
      </div>
      <h5>Edge</h5>
      <div class="controls">
        <div class="control button">
          <label>Add/Remove</label>
          <div class="action">
            <button :disabled="selectedNodes.length != 2" @click="addEdge">Add</button>
            <button :disabled="selectedEdges.length == 0" @click="removeEdge">Remove</button>
          </div>
        </div>
        <div class="control slider">
          <label for="edgeWidth">Width</label>
          <input
            id="edgeWidth"
            v-model.number="configs.edge.normal.width"
            type="range"
            min="1"
            max="32"
            step="1"
          >
          <div class="value">{{ configs.edge.normal.width }}</div>
        </div>
        <div class="control slider">
          <label for="edgeGap">Gap</label>
          <input
            id="edgeGap"
            v-model.number="configs.edge.gap"
            type="range"
            min="1"
            max="32"
            step="1"
          >
          <div class="value">{{ configs.edge.gap }}</div>
        </div>
        <div class="control color">
          <label for="edgeColor">Color</label>
          <input id="edgeColor" v-model="configs.edge.normal.color" type="color">
          <div class="value">
            <input v-model="configs.edge.normal.color" type="input">
          </div>
        </div>
        <div class="control text">
          <label for="edgeStrokeDasharray">Dasharray</label>
          <div class="value">
            <input id="edgeStrokeDasharray" v-model="configs.edge.normal.dasharray" type="text">
          </div>
        </div>
        <div class="control select">
          <label for="edgeStrokeLinecap">Linecap</label>
          <div class="value">
            <select id="edgeStrokeLinecap" v-model.number="configs.edge.normal.linecap">
              <option value="butt">butt</option>
              <option value="round">round</option>
              <option value="square">square</option>
            </select>
          </div>
        </div>
        <div class="control">
          <input id="edgeAnimate" v-model="configs.edge.normal.animate" type="checkbox">
          <label for="edgeAnimate">Animate</label>
        </div>
        <div class="control slider">
          <label for="edgeSpeed">Speed</label>
          <input
            id="edgeSpeed"
            v-model.number="configs.edge.normal.animationSpeed"
            type="range"
            min="10"
            max="1000"
            step="10"
          >
          <div class="value">{{ configs.edge.normal.animationSpeed }}</div>
        </div>
        <div class="control">
          <input id="edgeSelectable" v-model="configs.edge.selectable" type="checkbox">
          <label for="edgeSelectable">Selectable</label>
        </div>
        <div>
          <label>Selected Edges:</label>
          <ul>
            <li v-for="n in selectedEdges" :key="n">{{ n }}</li>
          </ul>
        </div>
      </div>

      <h5>Edge Label</h5>
      <div class="controls">
        <div class="control slider">
          <label for="edgeFontSize">Font Size</label>
          <input
            id="edgeFontSize"
            v-model.number="configs.edge.label.fontSize"
            type="range"
            min="1"
            max="32"
            step="1"
          >
          <div class="value">{{ configs.edge.label.fontSize }}</div>
        </div>
        <div class="control slider">
          <label for="edgeLabelMargin">Margin</label>
          <input
            id="edgeLabelMargin"
            v-model.number="configs.edge.label.margin"
            type="range"
            min="0"
            max="24"
            step="1"
          >
          <div class="value">{{ configs.edge.label.margin }}</div>
        </div>
        <div class="control slider">
          <label for="edgeLabelPadding">Padding</label>
          <input
            id="edgeLabelPadding"
            v-model.number="configs.edge.label.padding"
            type="range"
            min="0"
            max="24"
            step="1"
          >
          <div class="value">{{ configs.edge.label.padding }}</div>
        </div>
        <div class="control color">
          <label for="edgeLabelColor">Color</label>
          <input id="edgeLabelColor" v-model="configs.edge.label.color" type="color">
          <div class="value">
            <input v-model="configs.edge.label.color" type="input">
          </div>
        </div>
        <div class="control select">
          <label for="edgeLabelAlign">Align</label>
          <div class="value">
            <select id="edgeLabelAlign" v-model="edgeLabelAlign">
              <option value="center">center</option>
              <option value="source">source</option>
              <option value="target">target</option>
            </select>
          </div>
        </div>
        <div class="control select">
          <label for="edgeLabelVerticalAlign">Vertical Align</label>
          <div class="value">
            <select id="edgeLabelVerticalAlign" v-model="edgeLabelVerticalAlign">
              <option value="center">center</option>
              <option value="above">above</option>
              <option value="below">below</option>
            </select>
          </div>
        </div>
      </div>

      <h4>Path</h4>
      <div class="controls">
        <div class="control">
          <input id="pathVisible" v-model="configs.path.visible" type="checkbox">
          <label for="pathVisible">Visible</label>
        </div>
        <div class="control">
          <input id="pathClickable" v-model="configs.path.clickable" type="checkbox">
          <label for="pathClickable">Clickable</label>
        </div>
        <div class="control">
          <input id="pathCurveInNode" v-model="configs.path.curveInNode" type="checkbox">
          <label for="pathCurveInNode">Curve in node</label>
        </div>
        <div class="control button">
          <label>Add/Remove</label>
          <div class="action">
            <button :disabled="selectedEdges.length <= 1" @click="addPath">Add</button>
            <button :disabled="selectedPathItems.length == 0" @click="removePath">Remove</button>
          </div>
        </div>
        <div class="control select-list">
          <label for="pathList">Paths</label>
          <select
            id="pathList"
            v-model="selectedPathItems"
            multiple
            size="4"
          >
            <option v-for="(path, i) in paths" :key="i" :value="`${i}`">
              {{ path.edges.join(" -> ") }}
            </option>
          </select>
        </div>
        <div class="control slider">
          <label for="pathWidth">Width</label>
          <input
            id="pathWidth"
            v-model.number="configs.path.path.width"
            type="range"
            min="1"
            max="32"
            step="1"
          >
          <div class="value">{{ configs.path.path.width }}</div>
        </div>
        <div class="control text">
          <label for="pathDasharray">Dasharray</label>
          <div class="value">
            <input id="pathDasharray" v-model="configs.path.path.dasharray" type="text">
          </div>
        </div>
        <div class="control select">
          <label for="pathLinecap">Linecap</label>
          <div class="value">
            <select id="pathLinecap" v-model.number="configs.path.path.linecap">
              <option value="butt">butt</option>
              <option value="round">round</option>
              <option value="square">square</option>
            </select>
          </div>
        </div>
        <div class="control select">
          <label for="pathLinejoin">Linejoin</label>
          <div class="value">
            <select id="pathLinejoin" v-model.number="configs.path.path.linejoin">
              <option value="miter">miter</option>
              <option value="round">round</option>
              <option value="bevel">bevel</option>
            </select>
          </div>
        </div>
        <div class="control">
          <input id="pathAnimate" v-model="configs.path.path.animate" type="checkbox">
          <label for="pathAnimate">Animate</label>
        </div>
        <div class="control slider">
          <label for="pathSpeed">Speed</label>
          <input
            id="pathSpeed"
            v-model.number="configs.path.path.animationSpeed"
            type="range"
            min="10"
            max="1000"
            step="10"
          >
          <div class="value">{{ configs.path.path.animationSpeed }}</div>
        </div>
      </div>
      <h4>Grid</h4>
      <div class="controls">
        <div class="control">
          <input id="gridShow" v-model="configs.view.grid.visible" type="checkbox">
          <label for="gridShow">Show</label>
        </div>
        <div class="control slider">
          <label for="gridIntervalX">Interval</label>
          <input
            id="gridIntervalX"
            v-model.number="configs.view.grid.interval"
            type="range"
            min="5"
            max="500"
            step="5"
          >
          <div class="value">{{ configs.view.grid.interval }}</div>
        </div>
        <div class="control slider">
          <label for="gridThickIncrements">Increments</label>
          <input
            id="gridThickIncrements"
            v-model.number="configs.view.grid.thickIncrements"
            type="range"
            min="0"
            max="100"
            step="1"
          >
          <div class="value">{{ configs.view.grid.thickIncrements }}</div>
        </div>
        <div class="control slider">
          <label for="gridStrokeWidth">Width</label>
          <input
            id="gridStrokeWidth"
            v-model.number="configs.view.grid.line.strokeWidth"
            type="range"
            min="1"
            max="32"
            step="1"
          >
          <div class="value">{{ configs.view.grid.line.strokeWidth }}</div>
        </div>
        <div class="control color">
          <label for="gridNormalColor">Color</label>
          <input id="gridNormalColor" v-model="configs.view.grid.line.color" type="color">
          <div class="value">
            <input v-model="configs.view.grid.line.color" type="input">
          </div>
        </div>
        <div class="control text">
          <label for="gridNormalStrokeDasharray">Dasharray</label>
          <div class="value">
            <input
              id="gridNormalStrokeDasharray"
              v-model="configs.view.grid.line.strokeDasharray"
              type="text"
            >
          </div>
        </div>
        <div class="control slider">
          <label for="gridStrokeWidth">Thick Width</label>
          <input
            id="gridStrokeWidth"
            v-model.number="configs.view.grid.thick.strokeWidth"
            type="range"
            min="1"
            max="32"
            step="1"
          >
          <div class="value">{{ configs.view.grid.thick.strokeWidth }}</div>
        </div>
        <div class="control color">
          <label for="gridThickColor">Thick Color</label>
          <input id="gridThickColor" v-model="configs.view.grid.thick.color" type="color">
          <div class="value">
            <input v-model="configs.view.grid.thick.color" type="input">
          </div>
        </div>
        <div class="control text">
          <label for="gridThickStrokeDasharray">Thick Dasharray</label>
          <div class="value">
            <input
              id="gridThickStrokeDasharray"
              v-model="configs.view.grid.thick.strokeDasharray"
              type="text"
            >
          </div>
        </div>
      </div>
      <h4>Layouts</h4>
      <div class="controls">
        <div class="control select">
          <label for="layoutType">Type</label>
          <div class="value">
            <select id="layoutType" v-model="layoutType">
              <option value="simple">Simple</option>
              <option value="grid">Grid</option>
              <option value="force">Force</option>
            </select>
          </div>
        </div>
      </div>
      <div class="layouts">
        <pre>{{ layoutsText }}</pre>
      </div>
    </div>
    <v-network-graph
      ref="graph"
      v-model:zoom-level="zoomLevel"
      v-model:selected-nodes="selectedNodes"
      v-model:selected-edges="selectedEdges"
      class="network-graph"
      :layers="layers"
      :nodes="nodes"
      :edges="edges"
      :paths="paths"
      :configs="configs"
      :layouts="layouts"
      :event-handlers="{ '*': handleEvent }"
    >
      <text
        x="200"
        y="0"
        fill="black"
        font-size="10"
        text-anchor="start"
        dominant-baseline="text-before-edge"
      >Default layer over roo OK???</text>

      <template #layer1>
        <text
          x="200"
          y="10"
          fill="black"
          font-size="10"
          text-anchor="start"
          dominant-baseline="text-before-edge"
        >Layer1 over root OK???</text>
      </template>
      <template #layer2>
        <text
          x="200"
          y="20"
          fill="black"
          font-size="10"
          text-anchor="start"
          dominant-baseline="text-before-edge"
        >Layer2 over background OK???</text>
      </template>
      <template #layer3>
        <text
          x="200"
          y="40"
          fill="black"
          font-size="10"
          text-anchor="start"
          dominant-baseline="text-before-edge"
        >Layer3 over edge OK???</text>
      </template>
      <template #layer4>
        <text
          x="200"
          y="60"
          fill="black"
          font-size="10"
          text-anchor="start"
          dominant-baseline="text-before-edge"
        >Layer4 over focusring OK???</text>
      </template>
      <template #layer5>
        <text
          x="200"
          y="80"
          fill="black"
          font-size="10"
          text-anchor="start"
          dominant-baseline="text-before-edge"
        >Layer5 over nodes OK???</text>
      </template>
      <template #worldmap>
        <image
          href="worldmap.svg"
          x="0"
          y="0"
          width="1000px"
        />
      </template>

      <!-- Override node -->
      <template #override-node="{ nodeId, scale, config, ...slotProps }">
        <g v-if="nodeId == 'node1'" v-bind="slotProps">
          <circle :r="(config.radius ?? 1) * scale" fill="red" />
          <circle :r="((config.radius ?? 1) - 4) * scale" fill="white" />
        </g>
      </template>

      <!-- Override node label -->
      <template
        #override-node-label="{ nodeId, scale, text, textAnchor, dominantBaseline, ...slotProps }"
      >
        <text
          v-if="nodeId == 'node1'"
          v-bind="slotProps"
          :font-size="18 * scale"
          :text-anchor="textAnchor"
          :dominant-baseline="dominantBaseline"
          fill="red"
        >{{ text }}</text>
      </template>

      <!-- edge label -->
      <template #edge-label="{ edgeId, edge, scale, ...slotProps }">
        <!-- for once it is evaluated. -->
        <v-edge-label
          :text="edgeId"
          :align="edgeLabelAlign"
          :vertical-align="edgeLabelVerticalAlign"
          v-bind="slotProps"
        />
      </template>
    </v-network-graph>
    <div class="event-logs">
      <div v-for="log in eventLogs" :key="log">{{ log }}</div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, ref, watch } from "vue"
import throttle from "lodash-es/throttle"
import VNetworkGraph from "./components/network-graph.vue"
import { getConfigDefaults } from "./common/config-defaults"
import { UserLayouts, Nodes, Edges, Layers, Paths } from "./common/types"
import { GridLayout } from "./layouts/grid"
import { ForceLayout } from "./layouts/force"
import { LayoutHandler } from "./layouts/handler"
import VEdgeLabel from "./components/edge-label.vue"

interface SampleData {
  layers: Layers
  zoomLevel: number
  nodes: Nodes
  edges: Edges
  paths: Paths
  edgeLabelAlign: "center" | "source" | "target",
  edgeLabelVerticalAlign: "center" | "above" | "below",
  selectedNodes: string[]
  selectedEdges: string[]
  selectedPathItems: string[]
  eventLogs: string[]
}

export default /*#__PURE__*/ defineComponent({
  name: "NetworkGraphSample", // vue component name
  components: { VNetworkGraph, VEdgeLabel },
  setup() {
    const graph = ref()

    const configs = reactive(getConfigDefaults())

    const layouts = reactive<UserLayouts>({
      nodes: {
        node1: {
          x: 0,
          y: 0,
        },
        node2: {
          x: 0,
          y: 100,
        },
        node3: {
          x: 100,
          y: 0,
        },
        node4: {
          x: 100,
          y: 100,
        },
      },
    })

    const layoutType = ref<"simple" | "grid" | "force">("simple")
    const layoutHandlers: { [name: string]: LayoutHandler } = {
      simple: configs.view.layoutHandler,
      grid: new GridLayout({ grid: 10 }),
      force: new ForceLayout({
        positionFixedByDrag: false,
        positionFixedByClickWithAltKey: true,
      }),
    }
    watch(layoutType, type => {
      configs.view.layoutHandler = layoutHandlers[type]
    })

    const layoutsText = ref("")
    watch(
      () => layouts.nodes,
      throttle(() => (layoutsText.value = JSON.stringify(layouts, null, 2)), 100),
      { deep: true, immediate: true }
    )

    return {
      graph,
      configs,
      layouts,
      layoutType,
      layoutsText,
    }
  },
  data(): SampleData {
    return {
      layers: {
        layer1: "root",
        layer2: "background",
        layer3: "edges",
        layer4: "focusring",
        layer5: "nodes",
        worldmap: "background",
        grid: "root",
      },
      zoomLevel: 1,
      nodes: {
        node1: {
          name: "Node 1",
          type: "router",
        },
        node2: {
          name: "Node 2",
          type: "switch",
        },
        node3: {
          name: "Node 3",
          type: "router",
        },
        node4: {
          name: "Node 4",
          type: "router",
        },
      },
      edges: {
        edge1: {
          source: "node1",
          target: "node2",
        },
        edge2: {
          source: "node2",
          target: "node3",
        },
        edge3: {
          source: "node2",
          target: "node1",
        },
        edge4: {
          source: "node2",
          target: "node3",
        },
        edge5: {
          source: "node3",
          target: "node4",
        },
      },
      edgeLabelAlign: "center",
      edgeLabelVerticalAlign: "center",
      paths: [{ edges: ["edge1", "edge2"] }, { edges: ["edge3", "edge4", "edge5"] }],
      selectedNodes: ["node1"],
      selectedEdges: [],
      selectedPathItems: [],
      eventLogs: [],
    }
  },
  methods: {
    handleEvent(type: string, event?: unknown) {
      const timestamp = new Date().toISOString()
      const MAX = 100
      if (this.eventLogs.length > MAX) {
        this.eventLogs.splice(MAX, this.eventLogs.length - MAX)
      }
      this.eventLogs.unshift(`${timestamp} [${type}] ${JSON.stringify(event)}`)
    },
    addNode() {
      let nodeId = ""
      let id = 0
      do {
        nodeId = `node${++id}`
      } while (nodeId in this.nodes)

      // add node
      this.nodes[nodeId] = {
        name: `Node ${id}`,
        type: "router",
      }
    },
    removeNode() {
      if (this.selectedNodes.length === 0) return
      const removeNodes = [...this.selectedNodes]
      removeNodes.forEach(id => delete this.nodes[id])

      // remove connected edges
      Object.entries(this.edges)
        .filter(([_, edge]) => !(edge.source in this.nodes && edge.target in this.nodes))
        .map(([id, _]) => id)
        .forEach(id => delete this.edges[id])
    },
    addEdge() {
      if (this.selectedNodes.length !== 2) return
      let edgeId = ""
      let id = 0
      do {
        edgeId = `edge${++id}`
      } while (edgeId in this.edges)

      // add edge
      this.edges[edgeId] = {
        source: this.selectedNodes[0],
        target: this.selectedNodes[1],
      }
    },
    removeEdge() {
      if (this.selectedEdges.length === 0) return
      const removeEdges = [...this.selectedEdges]
      removeEdges.forEach(id => delete this.edges[id])
    },
    addPath() {
      if (this.selectedEdges.length <= 1) return
      this.paths.push({
        edges: [...this.selectedEdges],
      })
    },
    removePath() {
      const indexes = this.selectedPathItems.map(i => parseInt(i))
      this.paths = this.paths.filter((_, i) => !indexes.includes(i))
    },
    fitToContents() {
      this.graph?.fitToContents()
    },
    zoomIn() {
      this.graph?.zoomIn()
    },
    zoomOut() {
      this.graph?.zoomOut()
    },
    center() {
      this.graph?.panToCenter()
    },
    panToZero() {
      this.graph?.panTo({ x: 0, y: 0 })
    },
    panBy() {
      this.graph?.panBy({ x: 10, y: 10 })
    },
    getPan() {
      console.log(this.graph?.getPan())
    },
    getSizes() {
      console.log(this.graph?.getSizes())
    },
    downloadAsSvg() {
      const text = this.graph?.getAsSvg()
      const url = URL.createObjectURL(new Blob([text], { type: "octet/stream" }))
      const a = document.createElement("a")
      a.href = url
      a.download = "network-graph.svg"
      a.click()
      window.URL.revokeObjectURL(url)
    },
  },
})
</script>

<style lang="scss" scoped>
.network-graph-sample {
  position: relative;
  display: flex;
  flex-direction: row;
  margin: 20px;
  border: 1px solid #ccc;
  height: calc(100vh - 2px - 20px * 2);
}
.control-box {
  height: 100%;
  width: 300px;
  background-color: #ddd;
  display: flex;
  flex-direction: column;
  font-size: 90%;
  overflow-y: auto;
  h4 {
    margin: 10px 4px 0 4px;
    padding: 2px 4px;
    background-color: #aaa;
    border-radius: 3px;
  }
  h5 {
    margin: 4px 4px 0 8px;
    padding: 4px 2px 4px 4px;
    background-color: #bbb;
    border-radius: 3px;
  }
  div.controls {
    margin-top: 4px;
    margin-left: 10px;
  }
  label {
    font-size: 90%;
  }
  div.control {
    display: flex;
    flex-direction: row;
    label {
      margin-right: 10px;
    }
    .value {
      font-size: 84%;
      color: #666;
    }
  }
  .button {
    label {
      flex: 1;
    }
    .action {
      width: 160px;
      button {
        margin-right: 10px;
      }
    }
  }
  .slider {
    label {
      flex: 1;
    }
    input {
      width: 120px;
    }
    .value {
      width: 40px;
    }
  }
  .color {
    label {
      flex: 1;
    }
    input {
      width: 60px;
      height: 16px;
    }
    .value {
      padding-left: 4px;
      width: 90px;
      input {
        width: 70px;
      }
    }
  }
  .select-list {
    flex-direction: column !important;
    select {
      overflow-y: auto;
    }
  }
  .text,
  .select {
    label {
      flex: 1;
    }
    .value {
      width: 160px;
    }
    input {
      width: 80px;
    }
    select {
      width: 90px;
    }
  }
  ul {
    margin: 0;
  }
  .layouts {
    pre {
      margin: 4px 4px 0 10px;
      padding: 2px 4px;
      border: 1px solid #aaa;
      border-radius: 3px;
      background-color: #eee;
      height: 200px;
      overflow-y: auto;
    }
  }
}
.network-graph {
  flex: 1;
  height: 100%;
}
.event-logs {
  position: fixed;
  right: 10px;
  bottom: 10px;
  padding: 10px;
  overflow-y: auto;
  min-width: 340px;
  height: 150px;
  opacity: 0.5;
  background-color: #ffc;
  font-size: 70%;
}
</style>

<style lang="scss">
body {
  margin: 0;
}
</style>
