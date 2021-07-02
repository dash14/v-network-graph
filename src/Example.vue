
<template>
  <div class="network-topology-sample">
    <div class="control-box">
      <h4>Control</h4>
      <div class="controls">
        <div class="control slider">
          <label for="zoomLevel">Zoom Level</label>
          <input
            id="zoomLevel"
            v-model.number="zoomLevel"
            type="range"
            min="0.1"
            max="16"
            step="0.1"
          >
          <div class="value">{{ zoomLevel.toFixed(1) }}</div>
        </div>
        <div class="control">
          <label>Fit to objects</label>
          <button @click="fitToContents">Run</button>
        </div>
        <div class="control">
          <label>Pan to center</label>
          <button @click="center">Run</button>
        </div>
        <div>
          <label>Selected Nodes:</label>
          <ul>
            <li
              v-for="n in selectedNodes"
              :key="n"
            >{{ n }}</li>
          </ul>
        </div>
      </div>
      <h4>Styles</h4>

      <h5>View</h5>
      <div class="controls">
        <div class="control">
          <input
            id="viewResizeWithZooming"
            v-model="styles.view.resizeWithZooming"
            type="checkbox"
          >
          <label for="viewResizeWithZooming">Resize with zooming</label>
        </div>
      </div>

      <h5>Node</h5>
      <div class="controls">
        <div class="control slider">
          <label for="nodeSize">Size</label>
          <input
            id="nodeSize"
            v-model.number="styles.node.shape.radius"
            type="range"
            min="1"
            max="64"
            step="1"
          >
          <div class="value">{{ styles.node.shape.radius }}</div>
        </div>
        <div class="control color">
          <label for="nodeColor">Color</label>
          <input
            id="nodeColor"
            v-model="styles.node.shape.color"
            type="color"
          >
          <div class="value">
            <input v-model="styles.node.shape.color" type="input">
          </div>
        </div>
        <div class="control">
          <input
            id="nodeSelectable"
            v-model="styles.node.selectable"
            type="checkbox"
          >
          <label for="nodeSelectable">Selectable</label>
        </div>
      </div>
      <h5>Node Label</h5>
      <div class="controls">
        <div class="control slider">
          <label for="nodeFontSize">Font Size</label>
          <input
            id="nodeFontSize"
            v-model.number="styles.node.label.fontSize"
            type="range"
            min="1"
            max="32"
            step="1"
          >
          <div class="value">{{ styles.node.label.fontSize }}</div>
        </div>
        <div class="control slider">
          <label for="nodeLabelMargin">Margin</label>
          <input
            id="nodeLabelMargin"
            v-model.number="styles.node.label.margin"
            type="range"
            min="0"
            max="24"
            step="1"
          >
          <div class="value">{{ styles.node.label.margin }}</div>
        </div>
        <div class="control color">
          <label for="nodeLabelColor">Color</label>
          <input
            id="nodeLabelColor"
            v-model="styles.node.label.color"
            type="color"
          >
          <div class="value">
            <input v-model="styles.node.label.color" type="input">
          </div>
        </div>
        <div class="control">
          <label for="nodeLabelDirection">Direction</label>
          <select id="nodeLabelDirection" v-model.number="styles.node.label.direction">
            <option value="0">N</option>
            <option value="1">NE</option>
            <option value="2">E</option>
            <option value="3">SE</option>
            <option value="4">S</option>
            <option value="5">SW</option>
            <option value="6">W</option>
            <option value="7">NW</option>
          </select>
        </div>
      </div>
      <h5>Node Selection</h5>
      <div class="controls">
        <div class="control slider">
          <label for="nodeSelectionSize">Border Size</label>
          <input
            id="nodeSelectionSize"
            v-model.number="styles.node.selection.width"
            type="range"
            min="1"
            max="32"
            step="1"
          >
          <div class="value">{{ styles.node.selection.width }}</div>
        </div>
        <div class="control slider">
          <label for="nodeSelectionPadding">Padding</label>
          <input
            id="nodeSelectionPadding"
            v-model.number="styles.node.selection.padding"
            type="range"
            min="0"
            max="24"
            step="1"
          >
          <div class="value">{{ styles.node.selection.padding }}</div>
        </div>
        <div class="control color">
          <label for="nodeSelectionColor">Color</label>
          <input
            id="nodeSelectionColor"
            v-model="styles.node.selection.color"
            type="color"
          >
          <div class="value">
            <input v-model="styles.node.selection.color" type="input">
          </div>
        </div>
      </div>
      <h5>Link</h5>
      <div class="controls">
        <div class="control slider">
          <label for="linkWidth">Width</label>
          <input
            id="linkWidth"
            v-model.number="styles.link.width"
            type="range"
            min="1"
            max="32"
            step="1"
          >
          <div class="value">{{ styles.link.width }}</div>
        </div>
        <div class="control slider">
          <label for="linkGap">Gap</label>
          <input
            id="linkGap"
            v-model.number="styles.link.gap"
            type="range"
            min="1"
            max="32"
            step="1"
          >
          <div class="value">{{ styles.link.gap }}</div>
        </div>
        <div class="control color">
          <label for="linkColor">Color</label>
          <input
            id="linkColor"
            v-model="styles.link.color"
            type="color"
          >
          <div class="value">
            <input v-model="styles.link.color" type="input">
          </div>
        </div>
        <div class="control text">
          <label for="linkStrokeDasharray">Dasharray</label>
          <div class="value">
            <input
              id="linkStrokeDasharray"
              v-model="styles.link.strokeDasharray"
              type="text"
            >
          </div>
        </div>
      </div>
      <h4>Layouts</h4>
      <div class="layouts">
        <pre>{{ layouts }}</pre>
      </div>
    </div>
    <nt-topology
      ref="topology"
      v-model:zoomLevel="zoomLevel"
      v-model:mouseMode="mouseMode"
      v-model:selectedNodes="selectedNodes"
      class="topology"
      :layers="layers"
      :nodes="nodes"
      :links="links"
      :styles="styles"
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
    </nt-topology>
    <div class="event-logs">
      <div
        v-for="log in eventLogs"
        :key="log"
      >{{ log }}</div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, ref } from "vue"
import NtTopology from "./components/nt-topology.vue"
import { STYLE_DEFAULT } from "./components/common/style-defaults"
import { UserLayouts, Nodes, Links, NtLayerPos } from "./components/common/types"

interface SampleData {
  layers: { [name: string]: NtLayerPos }
  zoomLevel: number
  mouseMode: string
  nodes: Nodes
  links: Links
  selectedNodes: string[]
  layouts: UserLayouts
  eventLogs: string[]
}

export default /*#__PURE__*/ defineComponent({
  name: "NetworkTopologySample", // vue component name
  components: { NtTopology },
  setup() {
    const topology = ref()

    const fitToContents = () => {
      topology.value?.fitToContents()
    }

    const center = () => {
      topology.value?.center()
    }

    const styles = reactive(JSON.parse(JSON.stringify(STYLE_DEFAULT)))

    return { topology, fitToContents, center, styles }
  },
  data(): SampleData {
    return {
      layers: { layer1: NtLayerPos.BACKGROUND, layer2: NtLayerPos.BACKGROUND },
      zoomLevel: 1,
      mouseMode: "normal",
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
      links: {
        link1: {
          source: "node1",
          target: "node2",
        },
        link2: {
          source: "node2",
          target: "node3",
        },
        link3: {
          source: "node2",
          target: "node1",
        },
      },
      layouts: {
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
      },
      selectedNodes: ["node1"],
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
  },
})
</script>

<style lang="scss" scoped>
.network-topology-sample {
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
  .text {
    label {
      flex: 1;
    }
    .value {
      width: 160px;
    }
    input {
      width: 80px;
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
.topology {
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
