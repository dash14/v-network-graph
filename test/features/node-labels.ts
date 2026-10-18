import type { GraphCase } from "../helpers/graph"

const directions = [
  "center",
  "north",
  "north-east",
  "east",
  "south-east",
  "south",
  "south-west",
  "west",
  "north-west",
] as const

const single = {
  nodes: { node1: { name: "Node 1" } },
  layouts: { nodes: { node1: { x: 0, y: 0 } } },
}

export default [
  ...directions.map(direction => ({
    name: `direction-${direction}`,
    props: { ...single, configs: { node: { label: { direction } } } },
  })),
  {
    // Each label moves away from the edges of its node.
    name: "direction-auto-adjustment",
    props: {
      nodes: { node1: { name: "Node 1" }, node2: { name: "Node 2" }, node3: { name: "Node 3" } },
      edges: {
        edge1: { source: "node1", target: "node2" },
        edge2: { source: "node1", target: "node3" },
      },
      layouts: {
        nodes: { node1: { x: 0, y: 0 }, node2: { x: 0, y: 100 }, node3: { x: 100, y: -100 } },
      },
      configs: { node: { label: { directionAutoAdjustment: true } } },
    },
  },
  {
    name: "multiline-with-margin-and-line-height",
    props: {
      nodes: { node1: { name: "Line 1\nLine 2\nLine 3" } },
      layouts: single.layouts,
      configs: { node: { label: { margin: 10, lineHeight: 2, fontSize: 14 } } },
    },
  },
] satisfies GraphCase[]
