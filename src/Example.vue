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
          <label>Pan to center</label>
          <div class="action">
            <button @click="center">Run</button>
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
            <input id="nodeStrokeDasharray" v-model="configs.node.normal.strokeDasharray" type="text">
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
          <input id="nodeFocusRingVisible" v-model="configs.node.focusring.visible" type="checkbox">
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
      :configs="configs"
      :layouts="layouts"
      :event-handler="handleEvent"
    >
      <template #layer1>
        <text
          x="0"
          y="0"
          fill="black"
          font-size="10"
          text-anchor="start"
          dominant-baseline="text-before-edge"
        >Layer1 OK???</text>
      </template>
      <template #layer2>
        <text
          x="0"
          y="0"
          fill="black"
          font-size="10"
          text-anchor="start"
          dominant-baseline="text-before-edge"
        >Layer2 OK???</text>
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
import { UserLayouts, Nodes, Edges, LayerPos } from "./common/types"
import { GridLayout } from "./layouts/grid"
import { ForceLayout } from "./layouts/force"
import { LayoutHandler } from "./layouts/handler"

interface SampleData {
  layers: { [name: string]: LayerPos }
  zoomLevel: number
  nodes: Nodes
  edges: Edges
  selectedNodes: string[]
  selectedEdges: string[]
  eventLogs: string[]
}

export default /*#__PURE__*/ defineComponent({
  name: "NetworkGraphSample", // vue component name
  components: { VNetworkGraph },
  setup() {
    const graph = ref()

    const fitToContents = () => {
      graph.value?.fitToContents()
    }

    const center = () => {
      graph.value?.panToCenter()
    }

    const downloadAsSvg = () => {
      const text = graph.value?.getAsSvg()
      const url = URL.createObjectURL(new Blob([text], { type: "octet/stream" }))
      const a = document.createElement("a")
      a.href = url
      a.download = "network-graph.svg"
      a.click()
      window.URL.revokeObjectURL(url)
    }

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
      fitToContents,
      center,
      downloadAsSvg,
      configs,
      layouts,
      layoutType,
      layoutsText,
    }
  },
  data(): SampleData {
    return {
      layers: { layer1: LayerPos.BACKGROUND, layer2: LayerPos.BACKGROUND },
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
      },
      selectedNodes: ["node1"],
      selectedEdges: [],
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
