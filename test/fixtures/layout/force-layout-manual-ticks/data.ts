import { Nodes, Edges } from "v-network-graph"

const nodes: Nodes = {
  node0: {},
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
  node11: {},
  node12: {},
  node13: {},
  node14: {},
  node15: {},
}

const edges: Edges = {
  "edge0-4": { source: "node0", target: "node4" },
  "edge1-0": { source: "node1", target: "node0" },
  "edge2-0": { source: "node2", target: "node0" },
  "edge3-0": { source: "node3", target: "node0" },
  "edge4-8": { source: "node4", target: "node8" },
  "edge5-4": { source: "node5", target: "node4" },
  "edge6-4": { source: "node6", target: "node4" },
  "edge7-4": { source: "node7", target: "node4" },
  "edge8-12": { source: "node8", target: "node12" },
  "edge9-8": { source: "node9", target: "node8" },
  "edge10-8": { source: "node10", target: "node8" },
  "edge11-8": { source: "node11", target: "node8" },
  "edge12-0": { source: "node12", target: "node0" },
  "edge13-12": { source: "node13", target: "node12" },
  "edge14-12": { source: "node14", target: "node12" },
  "edge15-12": { source: "node15", target: "node12" },
}

export default { nodes, edges }
