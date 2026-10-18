import type { GraphCase } from "../helpers/graph"

const graph = {
  nodes: { node1: {}, node2: {}, node3: {} },
  edges: {
    edge1: { source: "node1", target: "node2" },
    edge2: { source: "node2", target: "node3" },
  },
  paths: { path1: { edges: ["edge1", "edge2"] } },
  layouts: {
    nodes: { node1: { x: -100, y: 0 }, node2: { x: 0, y: 50 }, node3: { x: 100, y: 0 } },
  },
}

export default [
  ...(["centerOfNode", "edgeOfNode"] as const).flatMap(end =>
    [false, true].map(curveInNode => ({
      name: `${end}${curveInNode ? "-curve-in-node" : ""}`,
      props: { ...graph, configs: { path: { visible: true, end, curveInNode } } },
    }))
  ),
  ...(["miter", "round", "bevel"] as const).map(linejoin => ({
    name: `linejoin-${linejoin}`,
    props: { ...graph, configs: { path: { visible: true, normal: { width: 12, linejoin } } } },
  })),
  {
    name: "margin",
    props: { ...graph, configs: { path: { visible: true, end: "edgeOfNode", margin: 6 } } },
  },
] satisfies GraphCase[]
