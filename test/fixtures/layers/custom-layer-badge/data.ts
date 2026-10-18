import { Nodes, Edges, Layouts, defineConfigs } from "v-network-graph"

const nodes: Nodes = {
  node1: { name: "Node 1", active: true },
  node2: { name: "Node 2", active: false },
  node3: { name: "Node 3", active: true },
  node4: { name: "Node 4", active: false },
}

const edges: Edges = {
  edge1: { source: "node1", target: "node2" },
  edge2: { source: "node2", target: "node3" },
  edge3: { source: "node3", target: "node4" },
}

const layouts: Layouts = {
  nodes: {
    node1: { x: 0, y: 0 },
    node2: { x: 80, y: 80 },
    node3: { x: 160, y: 0 },
    node4: { x: 240, y: 80 },
  },
}

const configs = defineConfigs({
  node: {
    normal: {
      type: "rect",
      width: 32,
      height: 32,
      borderRadius: 6,
      color: "#ffffff",
      strokeWidth: 1,
      strokeColor: "#888888",
    },
    hover: {
      color: "#eeeeee",
    },
  },
  edge: {
    normal: {
      width: 1,
      color: "#666666",
    },
    hover: {
      color: "#666666",
    },
  },
})

export default {
  nodes,
  edges,
  layouts,
  configs,
}
