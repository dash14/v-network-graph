import type { GraphCase } from "../helpers/graph"

const graph = {
  nodes: { node1: { name: "Node 1" }, node2: { name: "Node 2" }, node3: { name: "Node 3" } },
  edges: {
    edge1: { source: "node1", target: "node2" },
    edge2: { source: "node2", target: "node3" },
  },
  paths: { path1: { edges: ["edge1", "edge2"] } },
  layouts: {
    nodes: { node1: { x: -100, y: 0 }, node2: { x: 0, y: 0 }, node3: { x: 100, y: 0 } },
  },
}
const selectable = {
  node: { selectable: true },
  edge: { selectable: true },
  path: { visible: true, selectable: true },
}

export default [
  {
    name: "selected-nodes-with-focus-ring",
    props: { ...graph, configs: selectable, selectedNodes: ["node1", "node3"] },
  },
  {
    name: "selected-nodes-without-focus-ring",
    props: {
      ...graph,
      configs: { ...selectable, node: { selectable: true, focusring: { visible: false } } },
      selectedNodes: ["node1"],
    },
  },
  {
    name: "selected-node-style",
    props: {
      ...graph,
      configs: {
        ...selectable,
        node: {
          selectable: true,
          // A full style, since the selected style is not merged with the normal one.
          selected: {
            type: "rect",
            width: 30,
            height: 30,
            borderRadius: 4,
            color: "#ff8800",
            strokeWidth: 2,
            strokeColor: "#000000",
          },
        },
      },
      selectedNodes: ["node2"],
    },
  },
  {
    name: "selected-edges",
    props: { ...graph, configs: selectable, selectedEdges: ["edge2"] },
  },
  {
    name: "selected-paths",
    props: { ...graph, configs: selectable, selectedPaths: ["path1"] },
  },
] satisfies GraphCase[]
