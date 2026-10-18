import { Nodes, Edges, Layouts, defineConfigs } from "v-network-graph"

const nodes: Nodes = {
  node1: {},
  node2: {},
  node3: {},
  node4: {},
  node5: {},
  node6: {},
  node7: {},
  node8: {},
  node9: {},
  node10: {},
}

const edges: Edges = {
  edge1: { source: "node1", target: "node2" },
  edge2: { source: "node2", target: "node3" },
  edge3: { source: "node10", target: "node2" },
  edge4: { source: "node5", target: "node2" },
  edge5: { source: "node2", target: "node4" },
  edge6: { source: "node6", target: "node4" },
  edge7: { source: "node8", target: "node7" },
  edge8: { source: "node7", target: "node1" },
  edge9: { source: "node9", target: "node6" },
  edge10: { source: "node7", target: "node9" },
  edge11: { source: "node7", target: "node6" },
  edge12: { source: "node9", target: "node2" },
  edge13: { source: "node1", target: "node9" },
  edge14: { source: "node3", target: "node5" },
  edge15: { source: "node10", target: "node4" },
  edge16: { source: "node1", target: "node8" },
}

const layouts: Layouts = {
  nodes: {
    node1: { x: 365, y: 39 },
    node2: { x: 642, y: 161 },
    node3: { x: 802, y: 243 },
    node4: { x: 513, y: 307 },
    node5: { x: 809, y: 85 },
    node6: { x: 328, y: 385 },
    node7: { x: 226, y: 193 },
    node8: { x: 82, y: 110 },
    node9: { x: 486, y: 191 },
    node10: { x: 854, y: 428 },
  },
}

const configs = defineConfigs({
  node: {
    normal: {
      type: "circle",
      radius: 8,
      color: "#4466cc",
    },
    label: {
      visible: false,
    },
  },
})

export default {
  nodes,
  edges,
  layouts,
  configs,
}
