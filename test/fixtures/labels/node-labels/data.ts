import { Nodes, Edges, Layouts } from "v-network-graph"

const nodes: Nodes = {
  node1: { id: "node1", name: "Node 1", type: "Type A" },
  node2: { id: "node2", name: "Node 2", type: "Type B" },
  node3: { id: "node3", name: "Node 3", type: "Type A" },
  node4: { id: "node4", name: "Node 4\nMultiline", type: "Type C\nMultiline" },
  node5: { id: "node5", name: "Node 5\nMultiline", type: "Type D\nMultiline" },
}

const edges: Edges = {
  edge1: { source: "node1", target: "node2" },
  edge2: { source: "node2", target: "node3" },
  edge3: { source: "node3", target: "node4" },
  edge4: { source: "node4", target: "node5" },
}

const layouts: Layouts = {
  nodes: {
    node1: { x: 0, y: 0 },
    node2: { x: 80, y: 80 },
    node3: { x: 160, y: 0 },
    node4: { x: 240, y: 80 },
    node5: { x: 320, y: 0 },
  },
}

export default {
  nodes,
  edges,
  layouts,
}
