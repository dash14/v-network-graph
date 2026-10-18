import { Nodes, Layouts } from "v-network-graph"

const nodes: Nodes = {
  node0: { name: "N0" },
  node1: { name: "N1" },
  node2: { name: "N2" },
  node3: { name: "N3" },
}

const layouts: Layouts = {
  nodes: {
    node0: { x: 0, y: 0 },
    node1: { x: 150, y: 100 },
    node2: { x: 300, y: 0 },
    node3: { x: 450, y: 100 },
  },
}

export default {
  nodes,
  layouts,
}
