import { Nodes, Edges, Layouts, Paths } from "v-network-graph"

const nodes: Nodes = {
  node1: { name: "Node 001" },
  node2: { name: "Node 002" },
  node3: { name: "Node 003" },
  node4: { name: "Node 004" },
  node5: { name: "Node 005" },
  node6: { name: "Node 006" },
}

const edges: Edges = {
  edge1: { source: "node1", target: "node2" },
  edge2: { source: "node2", target: "node3" },
  edge3: { source: "node2", target: "node4" },
  edge4: { source: "node4", target: "node5" },
  edge5: { source: "node4", target: "node6" },
}

const paths: Paths = {
  path1: {
    edges: ["edge1", "edge3", "edge4"],
  },
}

const layouts: Layouts = {
  nodes: {
    node1: { x: 0, y: 0 },
    node2: { x: 80, y: 80 },
    node3: { x: 0, y: 160 },
    node4: { x: 240, y: 80 },
    node5: { x: 320, y: 0 },
    node6: { x: 320, y: 160 },
  },
}

export default {
  nodes,
  edges,
  paths,
  layouts,
}
