import type { Edge } from "@/index"
import type { GraphCase } from "../helpers/graph"

const nodes = { node1: {}, node2: {}, node3: {} }
const layouts = {
  nodes: { node1: { x: -100, y: 0 }, node2: { x: 100, y: 0 }, node3: { x: 0, y: 100 } },
}
// Edges in both directions between the same nodes, to show their order.
const multiEdges = {
  edge1: { source: "node1", target: "node2", color: "#ff0000" },
  edge2: { source: "node2", target: "node1", color: "#00aa00" },
  edge3: { source: "node1", target: "node2", color: "#0000ff" },
}
const coloredEdge = { normal: { color: (e: Edge) => e.color } }

// Pairs pointing down-left and up-right, where the orders differ by keepOrder.
const keepOrderGraph = {
  nodes: { a1: {}, a2: {}, b1: {}, b2: {} },
  edges: {
    a1: { source: "a1", target: "a2", color: "#ff0000" },
    a2: { source: "a1", target: "a2", color: "#0000ff" },
    b1: { source: "b1", target: "b2", color: "#ff0000" },
    b2: { source: "b1", target: "b2", color: "#0000ff" },
  },
  layouts: {
    nodes: {
      a1: { x: -50, y: -100 },
      a2: { x: -150, y: 50 },
      b1: { x: 50, y: 100 },
      b2: { x: 150, y: -50 },
    },
  },
}

export default [
  ...(["clock", "vertical", "horizontal"] as const).map(keepOrder => ({
    name: `keep-order-${keepOrder}`,
    props: { ...keepOrderGraph, configs: { edge: { ...coloredEdge, gap: 8, keepOrder } } },
  })),
  ...(["straight", "curve"] as const).map(type => ({
    name: `multiple-edges-${type}`,
    props: {
      nodes,
      edges: multiEdges,
      layouts,
      configs: { edge: { ...coloredEdge, gap: 12, type } },
    },
  })),
  ...(["butt", "round", "square"] as const).map(linecap => ({
    name: `linecap-${linecap}`,
    props: {
      nodes,
      edges: { edge1: { source: "node1", target: "node2" } },
      layouts,
      configs: { edge: { normal: { width: 8, linecap, dasharray: "10 10" } } },
    },
  })),
  {
    name: "margin",
    props: {
      nodes,
      edges: {
        edge1: { source: "node1", target: "node2" },
        edge2: { source: "node2", target: "node3" },
      },
      layouts,
      configs: { edge: { margin: 10 } },
    },
  },
] satisfies GraphCase[]
