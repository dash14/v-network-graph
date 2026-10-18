import { Nodes, Edges, Layouts } from "v-network-graph"

const nodes: Nodes = {
  node1: { id: "node1", name: "Node 1" },
  node2: { id: "node2", name: "Node 2" },
  node3: { id: "node3", name: "Node 3" },
  node4: { id: "node4", name: "Node 4" },
  node5: { id: "node5", name: "Node 5" },
}

const edges: Edges = {
  edge1: { source: "node1", target: "node2" },
  edge2: { source: "node2", target: "node3" },
  edge3: { source: "node3", target: "node4" },
  edge4: { source: "node4", target: "node5" },
  edge5: { source: "node5", target: "node1" },
}

const layouts: Layouts = {
  nodes: {
    node1: { x: 50, y: 0 },
    node2: { x: 0, y: 50 },
    node3: { x: 50, y: 100 },
    node4: { x: 150, y: 100 },
    node5: { x: 150, y: 0 },
  },
}

export default {
  nodes,
  edges,
  layouts,
}
