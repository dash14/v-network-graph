import { Nodes, Edges, Layouts, defineConfigs } from "v-network-graph"

const nodes: Nodes = {
  node1: { name: "Node 1" },
  node2: { name: "Node 2" },
  node3: { name: "Node 3" },
  node4: { name: "Node 4" },
}

const edges: Edges = {
  edge1: { source: "node1", target: "node2", label: "edge 1" },
  edge2: { source: "node2", target: "node3", label: "edge 2" },
  edge3: { source: "node2", target: "node3", label: "edge 3" },
  edge4: { source: "node2", target: "node3", label: "edge 4" },
  edge5: { source: "node2", target: "node3", label: "edge 5" },
  edge6: { source: "node2", target: "node3", label: "edge 6" },
  edge7: { source: "node2", target: "node3", label: "edge 7" },
  edge8: { source: "node2", target: "node3", label: "edge 8" },
  edge9: { source: "node2", target: "node3", label: "edge 9" },
  edge10: { source: "node2", target: "node4", label: "edge 10" },
}

const configs = defineConfigs({
  node: {
    label: {
      visible: false,
    },
  },
})

const layouts: Layouts = {
  nodes: {
    node1: { x: 0, y: 80 },
    node2: { x: 200, y: 80 },
    node3: { x: 360, y: 0 },
    node4: { x: 360, y: 160 },
  },
}

export default {
  nodes,
  edges,
  configs,
  layouts,
}
