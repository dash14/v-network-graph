import { Nodes, Edges, Layouts } from "v-network-graph"

const nodes: Nodes = {
  node1: {},
  node2: {},
  node3: {},
}

const edges: Edges = {
  edge1: { id: "edge1", source: "node1", target: "node2" },
  edge2: { id: "edge2", source: "node2", target: "node3" },
  edge3: { id: "edge3", source: "node1", target: "node1" }, // self-loop
  edge4: { id: "edge4", source: "node3", target: "node3" },
}

const layouts: Layouts = {
  nodes: {
    node1: { x: 0, y: 0 },
    node2: { x: 120, y: 0 },
    node3: { x: 240, y: 0 },
  },
}

export default {
  nodes,
  edges,
  layouts,
}
