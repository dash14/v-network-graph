import { Nodes, Edges, Layouts } from "v-network-graph"

const nodes: Nodes = {
  node1: { name: "N1" },
  node2: { name: "N2" },
}

const edges: Edges = {
  edge1: { source: "node1", target: "node2", color: "red" },
  edge2: { source: "node2", target: "node1", color: "green" },
}

const layouts: Layouts = {
  nodes: {
    node1: { x: 0, y: 0 },
    node2: { x: 80, y: 80 },
  },
}

export default {
  nodes,
  edges,
  layouts,
}
