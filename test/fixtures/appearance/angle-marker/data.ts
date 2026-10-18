import { Nodes, Edges, Layouts } from "v-network-graph"

const nodes: Nodes = {
  node1: { name: "A" },
  node2: { name: "B" },
  node3: { name: "C" },
  node4: { name: "D" },
  node5: { name: "E" },
  node6: { name: "F" },
}

const edges: Edges = {
  edge1: { source: "node1", target: "node3" },
  edge2: { source: "node2", target: "node3" },
  edge3: { source: "node3", target: "node4" },
  edge4: { source: "node4", target: "node5" },
  edge5: { source: "node4", target: "node6" },
}

const layouts: Layouts = {
  nodes: {
    node1: { x: 0, y: 0 },
    node2: { x: 0, y: 160 },
    node3: { x: 80, y: 80 },
    node4: { x: 240, y: 80 },
    node5: { x: 320, y: 0 },
    node6: { x: 320, y: 160 },
  },
}

export default {
  nodes,
  edges,
  layouts,
}
