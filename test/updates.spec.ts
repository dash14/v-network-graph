import { describe, expect, test, vi } from "vitest"
import type { Paths } from "@/index"
import { GraphProps, mountGraph } from "./helpers/graph"
import { serializeGraph } from "./helpers/serialize"
import { alignNumbers } from "./helpers/snapshot"

interface UpdateCase {
  name: string
  props: () => GraphProps
  update: (props: GraphProps) => void
}

const graphWithPath = (): GraphProps => ({
  nodes: { node1: { name: "Node 1" }, node2: { name: "Node 2" }, node3: { name: "Node 3" } },
  edges: {
    edge1: { source: "node1", target: "node2" },
    edge2: { source: "node2", target: "node3" },
  },
  paths: { path1: { edges: ["edge1", "edge2"] } },
  layouts: {
    nodes: { node1: { x: -100, y: 0 }, node2: { x: 0, y: 50 }, node3: { x: 100, y: 0 } },
  },
  configs: {
    node: { selectable: true, label: { text: "name" } },
    edge: { selectable: true },
    path: { visible: true, selectable: true },
  },
})

const graph = (): GraphProps => {
  const { paths: _, ...props } = graphWithPath()
  return props
}

const cases: Record<string, UpdateCase[]> = {
  nodes: [
    {
      name: "add a node",
      props: graph,
      update: props => {
        props.nodes.node4 = { name: "Node 4" }
        props.layouts.nodes.node4 = { x: 0, y: -50 }
      },
    },
    {
      name: "remove a node with its edges",
      props: graph,
      update: props => {
        delete props.nodes.node3
        delete props.edges!.edge2
      },
    },
    {
      name: "change a node",
      props: graph,
      update: props => (props.nodes.node1.name = "Renamed"),
    },
    {
      name: "replace the nodes",
      props: graph,
      update: props => (props.nodes = { node1: { name: "Only" } }),
    },
  ],
  edges: [
    {
      name: "add an edge",
      props: graph,
      update: props => (props.edges!.edge3 = { source: "node1", target: "node3" }),
    },
    {
      name: "add an edge between the same nodes",
      props: graph,
      update: props => (props.edges!.edge3 = { source: "node2", target: "node1" }),
    },
    {
      name: "remove an edge",
      props: graph,
      update: props => delete props.edges!.edge1,
    },
    {
      name: "reconnect an edge",
      props: graph,
      update: props => (props.edges!.edge2.source = "node1"),
    },
  ],
  paths: [
    {
      name: "add a path",
      props: graphWithPath,
      update: props => ((props.paths as Paths).path2 = { edges: ["edge2"] }),
    },
    {
      name: "remove a path",
      props: graphWithPath,
      update: props => delete (props.paths as Paths).path1,
    },
    {
      name: "change the edges of a path",
      props: graphWithPath,
      update: props => ((props.paths as Paths).path1.edges = ["edge1"]),
    },
  ],
  layouts: [
    {
      name: "move a node",
      props: graph,
      update: props => (props.layouts.nodes.node2 = { x: 0, y: -50 }),
    },
    {
      name: "replace the layouts",
      props: graph,
      update: props =>
        (props.layouts = {
          nodes: { node1: { x: 0, y: -100 }, node2: { x: 0, y: 0 }, node3: { x: 0, y: 100 } },
        }),
    },
  ],
  configs: [
    {
      name: "change the node style",
      props: graph,
      update: props =>
        (props.configs!.node!.normal = { type: "rect", color: "#ff0000", strokeWidth: 2 }),
    },
    {
      name: "change the edge style",
      props: graph,
      update: props => (props.configs!.edge!.normal = { width: 4, dasharray: "4 2" }),
    },
    {
      name: "add edge markers",
      props: graph,
      update: props => (props.configs!.edge!.marker = { target: { type: "arrow" } }),
    },
    {
      name: "hide the node labels",
      props: graph,
      update: props => (props.configs!.node!.label!.visible = false),
    },
    {
      name: "hide the paths",
      props: graphWithPath,
      update: props => (props.configs!.path!.visible = false),
    },
    {
      name: "curve the edges",
      props: graph,
      update: props => (props.configs!.edge!.type = "curve"),
    },
    {
      name: "bring a node to the front by its z-index",
      props: () => {
        const props = graph()
        props.layouts.nodes.node2 = { x: -90, y: 0 }
        props.configs!.node!.zOrder = { enabled: true, zIndex: n => n.zIndex ?? 0 }
        return props
      },
      update: props => (props.nodes.node1.zIndex = 1),
    },
  ],
  selection: [
    {
      name: "select a node",
      props: graph,
      update: props => (props.selectedNodes = ["node1"]),
    },
    {
      name: "select an edge",
      props: graph,
      update: props => (props.selectedEdges = ["edge2"]),
    },
    {
      name: "select a path",
      props: graphWithPath,
      update: props => (props.selectedPaths = ["path1"]),
    },
    {
      name: "deselect a node",
      props: () => ({ ...graph(), selectedNodes: ["node1", "node2"] }),
      update: props => (props.selectedNodes = ["node2"]),
    },
  ],
}

describe.each(Object.entries(cases))("updating %s after mount", (_, featureCases) => {
  test.each(featureCases)("$name renders as mounting the result does", async c => {
    const after = c.props()
    c.update(after)
    const fresh = await mountGraph(after)
    const expected = serializeGraph(fresh.screen.container, { sortAttributes: true })

    const { screen, state } = await mountGraph(c.props())
    c.update(state)
    await vi.waitFor(
      () => {
        const actual = serializeGraph(screen.container, { sortAttributes: true })
        expect(alignNumbers(actual, expected)).toBe(expected)
      },
      { timeout: 5000 }
    )
  })
})
