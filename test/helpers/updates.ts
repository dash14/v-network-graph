import type { Edges, InputPaths, Layouts, Nodes } from "@/index"

/** The props of a graph that an update can change. */
export interface GraphState {
  nodes: Nodes
  edges: Edges
  paths: InputPaths
  layouts: Layouts
  selectedNodes: string[]
  selectedEdges: string[]
  selectedPaths: string[]
  zoomLevel: number
}

/** A change that any graph can take, to compare its result with a mount of that result. */
export interface GraphUpdate {
  name: string
  update: (state: GraphState) => void
}

export const updates: GraphUpdate[] = [
  {
    name: "move the nodes",
    update: ({ layouts }) => {
      Object.values(layouts.nodes).forEach((pos, i) => {
        // Different directions, so that the edges turn as well as move.
        pos.x += [30, -20, 10][i % 3]
        pos.y += [-10, 25, 15, -30][i % 4]
      })
    },
  },
  // The others are cleared, since the graph selects one kind of object at a time.
  {
    name: "select a node",
    update: state => {
      state.selectedNodes = Object.keys(state.nodes).slice(0, 1)
      state.selectedEdges = []
      state.selectedPaths = []
    },
  },
  {
    name: "select an edge",
    update: state => {
      state.selectedNodes = []
      state.selectedEdges = Object.keys(state.edges).slice(0, 1)
      state.selectedPaths = []
    },
  },
  {
    name: "add a node with an edge",
    update: ({ nodes, edges, layouts }) => {
      // Copies of the first ones, so that the slots and configs find the fields they read.
      const [nodeId, node] = Object.entries(nodes)[0] ?? []
      nodes.added = { ...node }
      layouts.nodes.added = { x: 0, y: -150 }
      const edge = Object.values(edges)[0]
      if (nodeId && edge) edges.added = { ...edge, source: nodeId, target: "added" }
    },
  },
  {
    name: "remove a node with its edges",
    update: ({ nodes, edges, layouts }) => {
      const id = Object.keys(nodes).at(-1)
      if (!id) return
      delete nodes[id]
      delete layouts.nodes[id]
      for (const [edgeId, edge] of Object.entries(edges)) {
        if (edge.source === id || edge.target === id) delete edges[edgeId]
      }
    },
  },
  {
    name: "zoom in",
    update: state => (state.zoomLevel *= 1.5),
  },
]
