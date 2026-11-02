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

// Two edges between each pair, so that curved edges bend away from the line between the nodes.
// The single edge to node4 is drawn straight.
const curved = {
  nodes: { ...graph.nodes, node4: {} },
  edges: {
    edge1: { source: "node1", target: "node2" },
    edge1b: { source: "node1", target: "node2" },
    edge2: { source: "node3", target: "node2" },
    edge2b: { source: "node3", target: "node2" },
    edge3: { source: "node3", target: "node4" },
  },
  paths: {
    path1: { edges: ["edge1", "edge2"] },
    path2: { edges: ["edge1b", "edge2b", "edge3"] },
    path3: { edges: ["edge3", "edge2"] },
  },
  layouts: { nodes: { ...graph.layouts.nodes, node4: { x: 100, y: -100 } } },
}

const looped = {
  nodes: graph.nodes,
  edges: {
    loop1: { source: "node1", target: "node1" },
    edge1: { source: "node1", target: "node2" },
    loop2: { source: "node2", target: "node2" },
    edge2: { source: "node2", target: "node3" },
    loop3: { source: "node3", target: "node3" },
  },
  paths: {
    path1: { edges: ["loop1", "edge1", "loop2", "edge2", "loop3"] },
    // Back along edge1, which goes through loop2 the other way.
    path2: { edges: ["edge2", "loop2", "edge1"] },
  },
  layouts: graph.layouts,
}

const ends = ["centerOfNode", "edgeOfNode"] as const

// Paths that turn at the center node by several angles, along edges shifted sideways in pairs.
const turnAngles = [0, 30, 60, 100, 150, 175]
const turning = {
  nodes: {
    left: {},
    center: {},
    top: {},
    bottom: {},
    ...Object.fromEntries(turnAngles.map(a => [`to${a}`, {}])),
  },
  edges: {
    in1: { source: "left", target: "center" },
    in2: { source: "left", target: "center" },
    down1: { source: "top", target: "center" },
    down2: { source: "center", target: "bottom" },
    ...Object.fromEntries(
      turnAngles.flatMap(a => [
        [`out${a}a`, { source: "center", target: `to${a}` }],
        [`out${a}b`, { source: `to${a}`, target: "center" }],
      ])
    ),
  },
  paths: {
    ...Object.fromEntries(
      turnAngles.flatMap(a => [
        [`path${a}a`, { edges: ["in1", `out${a}a`] }],
        [`path${a}b`, { edges: ["in2", `out${a}b`] }],
      ])
    ),
    vertical: { edges: ["down1", "down2"] },
  },
  layouts: {
    nodes: {
      left: { x: -120, y: 0 },
      center: { x: 0, y: 0 },
      top: { x: 0, y: -120 },
      bottom: { x: 0, y: 120 },
      ...Object.fromEntries(
        turnAngles.map(a => {
          const rad = (a * Math.PI) / 180
          return [`to${a}`, { x: 120 * Math.cos(rad), y: 120 * Math.sin(rad) }]
        })
      ),
    },
  },
}

export default [
  ...[curved, looped].flatMap((props, i) =>
    ends.flatMap(end =>
      [false, true].map(curveInNode => ({
        name: `${i === 0 ? "curved-edges" : "self-loops"}-${end}${curveInNode ? "-curve-in-node" : ""}`,
        props: {
          ...props,
          configs: { edge: { type: "curve" as const }, path: { visible: true, end, curveInNode } },
        },
      }))
    )
  ),
  // The gaps shift the edges into the inner circle of the node, into the node only, and past it.
  ...[4, 12, 24, 40].map(gap => ({
    name: `turning-gap-${gap}`,
    props: {
      ...turning,
      configs: { edge: { gap, summarize: false }, path: { visible: true, curveInNode: true } },
    },
  })),
  {
    name: "self-loops-apart-counterclockwise",
    props: {
      ...looped,
      configs: {
        edge: { selfLoop: { offset: 30, isClockwise: false } },
        path: { visible: true, curveInNode: true },
      },
    },
  },
  // The nodes overlap, so that the margins at both ends pass the ends of the path.
  ...[false, true].map(curveInNode => ({
    name: `overlapping-nodes${curveInNode ? "-curve-in-node" : ""}`,
    props: {
      ...graph,
      layouts: {
        nodes: { node1: { x: -10, y: 0 }, node2: { x: 0, y: 5 }, node3: { x: 10, y: 0 } },
      },
      configs: { path: { visible: true, end: "edgeOfNode" as const, margin: 6, curveInNode } },
    },
  })),
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
  // The edges are shifted farther from the centers of the nodes than the margin.
  {
    name: "margin-within-edge-gap",
    props: {
      ...graph,
      edges: {
        ...graph.edges,
        edge1b: { source: "node1", target: "node2" },
        edge2b: { source: "node2", target: "node3" },
      },
      paths: { ...graph.paths, path2: { edges: ["edge1b", "edge2b"] } },
      configs: {
        edge: { gap: 12, summarize: false },
        path: { visible: true, end: "centerOfNode", margin: 4 },
      },
    },
  },
] satisfies GraphCase[]
