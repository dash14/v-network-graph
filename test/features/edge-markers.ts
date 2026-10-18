import type { GraphCase } from "../helpers/graph"

const graph = {
  nodes: { node1: {}, node2: {} },
  edges: { edge1: { source: "node1", target: "node2" } },
  layouts: { nodes: { node1: { x: -100, y: 0 }, node2: { x: 100, y: 0 } } },
}

const types = ["arrow", "angle", "circle"] as const
const unitsList = ["strokeWidth", "userSpaceOnUse"] as const

export default [
  {
    name: "none",
    props: {
      ...graph,
      configs: { edge: { marker: { source: { type: "none" }, target: { type: "none" } } } },
    },
  },
  ...types.flatMap(type =>
    unitsList.map(units => ({
      name: `${type}-in-${units}`,
      props: {
        ...graph,
        configs: {
          edge: {
            normal: { width: 3 },
            marker: {
              source: { type, units, width: 6, height: 6 },
              target: { type, units, width: 6, height: 6 },
            },
          },
        },
      },
    }))
  ),
  {
    name: "margin-and-offset",
    props: {
      ...graph,
      configs: {
        edge: {
          margin: 4,
          marker: { target: { type: "arrow", margin: 2, offset: 3 } },
        },
      },
    },
  },
  {
    name: "color-and-rect-nodes",
    props: {
      ...graph,
      configs: {
        node: { normal: { type: "rect", width: 40, height: 20 } },
        edge: { margin: 2, marker: { target: { type: "arrow", color: "#ff0000" } } },
      },
    },
  },
] satisfies GraphCase[]
