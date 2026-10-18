import { Nodes, Edges, Layouts } from "v-network-graph"

const nodes: Nodes = {
  node1: { name: "Node 1" },
  node2: { name: "Node 2" },
  node3: { name: "Node 3" },
  node4: { name: "Node 4" },
}

const edges: Edges = {
  edge1: { source: "node1", target: "node3", color: "#aa8888", zIndex: 2 },
  edge2: { source: "node2", target: "node4", color: "#44cccc", zIndex: 1 },
}

const layouts: Layouts = {
  nodes: {
    node1: { x: 0, y: 0 },
    node2: { x: 40, y: 50 },
    node3: { x: 240, y: 0 },
    node4: { x: 200, y: -50 },
  },
}

export default {
  nodes,
  edges,
  layouts,
}
