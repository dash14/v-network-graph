import { Nodes, Edges, Layouts } from "v-network-graph"

const nodes: Nodes = {
  node1: { name: "Node 1" },
  node2: { name: "Node 2" },
  node3: { name: "Node 3" },
  node4: { name: "Node 4" },
  node5: { name: "Node 5" },
  node6: { name: "Node 6" },
}

const edges: Edges = {
  edge1: { source: "node1", target: "node2" },
  edge2: { source: "node3", target: "node2" },
  edge3: { source: "node2", target: "node4" },
  edge4: { source: "node2", target: "node4" },
  edge5: { source: "node4", target: "node5" },
  edge6: { source: "node4", target: "node6" },
  edge7: { source: "node3", target: "node2" },
  edge8: { source: "node4", target: "node5" },
}

const layouts: Layouts = {
  nodes: {
    node1: { x: 0, y: 0 },
    node2: { x: 100, y: 60 },
    node3: { x: 0, y: 110 },
    node4: { x: 250, y: 60 },
    node5: { x: 350, y: 10 },
    node6: { x: 350, y: 110 },
    node7: { x: 450, y: 10 },
    node8: { x: 450, y: 60 },
    node9: { x: 450, y: 110 },
    node10: { x: 450, y: 160 },
  },
}

export default {
  nodes,
  edges,
  layouts,
}
