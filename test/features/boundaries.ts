import type { GraphCase } from "../helpers/graph"

const layouts = { nodes: { node1: { x: -50, y: 0 }, node2: { x: 50, y: 0 } } }

export default [
  {
    name: "no-nodes",
    props: { nodes: {}, layouts: { nodes: {} } },
  },
  {
    name: "nodes-at-the-same-position",
    props: {
      nodes: { node1: { name: "Node 1" }, node2: { name: "Node 2" } },
      layouts: { nodes: { node1: { x: 0, y: 0 }, node2: { x: 0, y: 0 } } },
      configs: { node: { label: { text: "name" } } },
    },
  },
  {
    name: "zero-length-edge",
    props: {
      nodes: { node1: {}, node2: {} },
      edges: { edge1: { source: "node1", target: "node2" } },
      layouts: { nodes: { node1: { x: 0, y: 0 }, node2: { x: 0, y: 0 } } },
      configs: { edge: { marker: { target: { type: "arrow" } } } },
    },
  },
  {
    name: "edge-to-a-missing-node",
    props: {
      nodes: { node1: {}, node2: {} },
      edges: {
        edge1: { source: "node1", target: "node2" },
        edge2: { source: "node2", target: "node3" },
      },
      paths: { path1: { edges: ["edge1", "edge2"] } },
      layouts,
      configs: { path: { visible: true } },
    },
  },
] satisfies GraphCase[]
