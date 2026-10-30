import { describe, expect, test } from "vitest"
import { h } from "vue"
import type { EdgeLabelArea, Paths } from "@/index"
import { GraphProps, GraphSlots, mountGraph } from "./helpers/graph"
import { expectToRenderAs, markupOf } from "./helpers/markup"

interface UpdateCase {
  name: string
  props: () => GraphProps
  update: (props: GraphProps) => void
  slots?: GraphSlots
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

// The summarized stroke is as wide as the edges in the group added up.
const graphWithSummarizedStroke = (): GraphProps => ({
  ...graph(),
  edges: {
    edge1: { source: "node1", target: "node2", width: 10 },
    edge2: { source: "node2", target: "node3" },
    edge3: { source: "node2", target: "node1", width: 10 },
  },
  configs: {
    ...graph().configs,
    edge: {
      normal: { width: 30 },
      summarized: {
        stroke: {
          width: edges => Object.values(edges).reduce((sum, e) => sum + (e.width ?? 1), 0),
        },
      },
    },
  },
})

// Draws the area of the label, which is laid out by the width of the summarized stroke.
const edgesLabelArea = ({ area }: { area: EdgeLabelArea }) =>
  h("polygon", {
    class: "edges-label-area",
    points: [area.source.above, area.target.above, area.target.below, area.source.below]
      .map(p => `${p.x},${p.y}`)
      .join(" "),
  })

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
      name: "remove the last node of a path, leaving its edges",
      props: graphWithPath,
      update: props => delete props.nodes.node3,
    },
    {
      name: "remove the first node of a path, leaving its edges",
      props: graphWithPath,
      update: props => delete props.nodes.node1,
    },
    {
      name: "remove the middle node of a path, leaving its edges",
      props: graphWithPath,
      update: props => delete props.nodes.node2,
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
    {
      name: "replace the edges, keeping a pair of nodes they connect",
      props: graph,
      update: props =>
        (props.edges = {
          edge1: { source: "node1", target: "node3" },
          edge2: { source: "node3", target: "node2" },
        }),
    },
    {
      name: "reorder the groups of edges, keeping one summarized",
      props: () => ({
        ...graph(),
        edges: {
          edge1: { source: "node1", target: "node2" },
          edge2: { source: "node2", target: "node3" },
          edge3: { source: "node2", target: "node1" },
        },
        configs: { ...graph().configs, edge: { normal: { width: 30 } } },
      }),
      update: props =>
        (props.edges = {
          edge2: { source: "node2", target: "node3" },
          edge1: { source: "node1", target: "node2" },
          edge3: { source: "node2", target: "node1" },
        }),
    },
    {
      name: "add an edge to a summarized group whose stroke depends on its edges",
      props: graphWithSummarizedStroke,
      update: props => (props.edges!.edge4 = { source: "node1", target: "node2", width: 10 }),
      slots: { "edges-label": edgesLabelArea },
    },
    {
      name: "reorder the edges between the same nodes",
      props: () => ({
        ...graph(),
        edges: {
          edge1: { source: "node1", target: "node2" },
          edge2: { source: "node2", target: "node1" },
        },
      }),
      update: props =>
        (props.edges = {
          edge2: { source: "node2", target: "node1" },
          edge1: { source: "node1", target: "node2" },
        }),
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
    {
      name: "remove an edge of a path",
      props: graphWithPath,
      update: props => delete props.edges!.edge2,
    },
    {
      name: "reconnect an edge of a path",
      props: graphWithPath,
      update: props => (props.edges!.edge2.source = "node1"),
    },
    {
      name: "replace the edges of a path",
      props: graphWithPath,
      update: props =>
        (props.edges = {
          edge1: { source: "node1", target: "node2" },
          edge2: { source: "node1", target: "node3" },
        }),
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
      name: "select a node and an edge at once",
      props: graph,
      update: props => {
        props.selectedNodes = ["node1"]
        props.selectedEdges = ["edge2"]
      },
    },
    {
      name: "select a node, an edge and a path at once",
      props: graphWithPath,
      update: props => {
        props.selectedNodes = ["node1"]
        props.selectedEdges = ["edge2"]
        props.selectedPaths = ["path1"]
      },
    },
    {
      name: "select a node and another edge at once while an edge is selected",
      props: () => ({ ...graph(), selectedEdges: ["edge1"] }),
      update: props => {
        props.selectedNodes = ["node1"]
        props.selectedEdges = ["edge2"]
      },
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
    const fresh = await mountGraph(after, { slots: c.slots })
    const expected = markupOf(fresh.screen.container)

    const { screen, state } = await mountGraph(c.props(), { slots: c.slots })
    c.update(state)
    await expectToRenderAs(screen.container, expected)
  })
})

// The last of nodes, edges and paths stays selected, whether given at mount or by an update.
describe("selecting several kinds of objects at once", () => {
  test("mounting with nodes and edges keeps only the edges", async () => {
    const { state } = await mountGraph({
      ...graph(),
      selectedNodes: ["node1"],
      selectedEdges: ["edge2"],
    })
    await expect.poll(() => state.selectedNodes).toEqual([])
    expect(state.selectedEdges).toEqual(["edge2"])
  })

  test("mounting with nodes, edges and paths keeps only the paths", async () => {
    const { state } = await mountGraph({
      ...graphWithPath(),
      selectedNodes: ["node1"],
      selectedEdges: ["edge2"],
      selectedPaths: ["path1"],
    })
    await expect.poll(() => [state.selectedNodes, state.selectedEdges]).toEqual([[], []])
    expect(state.selectedPaths).toEqual(["path1"])
  })

  test("updating nodes and edges keeps only the edges while an edge is selected", async () => {
    const { state } = await mountGraph({ ...graph(), selectedEdges: ["edge1"] })
    state.selectedNodes = ["node1"]
    state.selectedEdges = ["edge2"]
    await expect.poll(() => state.selectedNodes).toEqual([])
    expect(state.selectedEdges).toEqual(["edge2"])
  })

  test("mounting with nodes and paths keeps only the paths", async () => {
    const { state } = await mountGraph({
      ...graphWithPath(),
      selectedNodes: ["node1"],
      selectedPaths: ["path1"],
    })
    await expect.poll(() => state.selectedNodes).toEqual([])
    expect(state.selectedPaths).toEqual(["path1"])
  })
})
