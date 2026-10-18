import { Nodes, Edges, Layouts } from "v-network-graph"

const nodes: Nodes = {
  node1: { name: "Node 1", zIndex: 1, color: "#4466cc", radius: 24 },
  node2: { name: "Node 2", zIndex: 2, color: "#44cccc", radius: 36 },
  node3: { name: "Node 3", zIndex: 2, color: "#44cccc", radius: 36 },
  node4: { name: "Node 4", zIndex: 1, color: "#4466cc", radius: 24 },
}

const edges: Edges = {
  edge1: { source: "node1", target: "node2" },
  edge2: { source: "node2", target: "node3" },
  edge3: { source: "node3", target: "node4" },
}

const layouts: Layouts = {
  nodes: {
    node1: { x: 0, y: 0 },
    node2: { x: 55, y: 0 },
    node3: { x: 180, y: 0 },
    node4: { x: 235, y: 0 },
  },
}

export default {
  nodes,
  edges,
  layouts,
}
