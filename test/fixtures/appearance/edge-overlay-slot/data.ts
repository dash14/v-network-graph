import { Nodes, Edges, Layouts } from "v-network-graph"

const nodes: Nodes = {
  node0: { name: "N0" },
  node1: { name: "N1" },
  node2: { name: "N2" },
}

const edges: Edges = {
  edge1: { id: "edge1", source: "node0", target: "node1" },
  edge2: { id: "edge2", source: "node1", target: "node2" },
  edge3: { id: "edge3", source: "node2", target: "node1" },
  edge4: { id: "edge4", source: "node2", target: "node3" },
  edge5: { id: "edge5", source: "node0", target: "node2" },
}

const layouts: Layouts = {
  nodes: {
    node0: { x: 80, y: 0 },
    node1: { x: 0, y: 120 },
    node2: { x: 160, y: 120 },
  },
}

export default {
  nodes,
  edges,
  layouts,
}
