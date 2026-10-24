import { describe, expect, test } from "vitest"
import { h, nextTick, reactive, readonly } from "vue"
import type { Layouts, UserConfigs } from "@/index"
import { at, drag, mountGraph } from "./helpers/graph"
import { markupOf } from "./helpers/markup"

const nodes = {
  node1: { name: "Node 1", size: 16 },
  node2: { name: "Node 2", size: 16 },
  node3: { name: "Node 3", size: 16 },
}

const edges = {
  edge1: { source: "node1", target: "node2" },
  edge2: { source: "node1", target: "node2" },
  edge3: { source: "node2", target: "node3" },
  edge4: { source: "node3", target: "node3" },
}

const before: Layouts = {
  nodes: {
    node1: { x: -100, y: 0 },
    node2: { x: 0, y: -50 },
    node3: { x: 100, y: 0 },
  },
}

const after: Layouts = {
  nodes: {
    node1: { x: -80, y: 60 },
    node2: { x: 20, y: 0 },
    node3: { x: 120, y: -40 },
  },
}

function configsWith(type: "straight" | "curve"): UserConfigs {
  return {
    node: {
      normal: { radius: node => node.size },
      label: { visible: true, directionAutoAdjustment: true },
    },
    edge: {
      type,
      selectable: true,
      selected: { width: 6 },
      marker: { target: { type: "arrow", units: "strokeWidth" } },
      gap: 20,
    },
  }
}

describe("positions", () => {
  test.each(["straight", "curve"] as const)(
    "moved %s edges, nodes and labels render as they do when mounted at the new positions",
    async type => {
      const moved = await mountGraph({ nodes, edges, layouts: before, configs: configsWith(type) })
      for (const [id, pos] of Object.entries(after.nodes)) {
        Object.assign(moved.state.layouts.nodes[id], pos)
      }
      await nextTick()

      const fresh = await mountGraph({ nodes, edges, layouts: after, configs: configsWith(type) })

      expect(markupOf(moved.screen.container)).toBe(markupOf(fresh.screen.container))
    }
  )

  test.each(["straight", "curve"] as const)(
    "%s edges follow the size of their nodes and their own stroke as a fresh mount does",
    async type => {
      const changed = await mountGraph({
        nodes,
        edges,
        layouts: before,
        configs: configsWith(type),
      })
      changed.state.nodes.node2.size = 30
      changed.state.selectedEdges = ["edge1", "edge4"]
      await nextTick()

      const fresh = await mountGraph({
        nodes: { ...nodes, node2: { ...nodes.node2, size: 30 } },
        edges,
        layouts: before,
        configs: configsWith(type),
        selectedEdges: ["edge1", "edge4"],
      })

      expect(markupOf(changed.screen.container)).toBe(markupOf(fresh.screen.container))
    }
  )

  test.each(["straight", "curve"] as const)(
    "overlays along moved %s edges render as they do when mounted at the new positions",
    async type => {
      // Points along the path, which the overlay reads from the edge's path element.
      const slots = {
        "edge-overlay": ({
          length,
          pointAtLength,
        }: {
          length: number
          pointAtLength: (d: number) => { x: number; y: number }
        }) => {
          const p = pointAtLength(length / 2)
          return h("circle", { r: 2, cx: Math.round(p.x), cy: Math.round(p.y) })
        },
      }
      const graph = { nodes, edges, configs: configsWith(type) }
      const moved = await mountGraph({ ...graph, layouts: before }, { slots })
      for (const [id, pos] of Object.entries(after.nodes)) {
        Object.assign(moved.state.layouts.nodes[id], pos)
      }
      await nextTick()

      const fresh = await mountGraph({ ...graph, layouts: after }, { slots })

      expect(markupOf(moved.screen.container)).toBe(markupOf(fresh.screen.container))
    }
  )

  test("a node added again keeps following its given position without a v-model", async () => {
    const { screen, state } = await mountGraph(
      {
        nodes: { node1: { name: "Node 1" }, node2: { name: "Node 2" } },
        layouts: { nodes: { node1: { x: 0, y: 0 }, node2: { x: 100, y: 0 } } },
      },
      { layoutsListener: null }
    )
    const node2 = state.nodes.node2
    delete state.nodes.node2
    await nextTick()
    state.nodes.node2 = node2
    await nextTick()

    state.layouts.nodes.node2.x = 200
    await nextTick()

    const transforms = [...screen.container.querySelectorAll(".v-ng-node")].map(el =>
      el.getAttribute("transform")
    )
    expect(transforms).toContain("translate(200 0)")
  })

  test("a node added again follows the layouts given last without a v-model", async () => {
    const { screen, state } = await mountGraph(
      {
        nodes: { node1: { name: "Node 1" }, node2: { name: "Node 2" } },
        layouts: { nodes: { node1: { x: 0, y: 0 }, node2: { x: 100, y: 0 } } },
      },
      { layoutsListener: null }
    )
    state.layouts = { nodes: { node1: { x: 0, y: 0 }, node2: { x: 100, y: 0 } } }
    await nextTick()
    const node2 = state.nodes.node2
    delete state.nodes.node2
    await nextTick()
    state.nodes.node2 = node2
    await nextTick()

    state.layouts.nodes.node2.x = 300
    await nextTick()

    const transforms = [...screen.container.querySelectorAll(".v-ng-node")].map(el =>
      el.getAttribute("transform")
    )
    expect(transforms).toContain("translate(300 0)")
  })

  test("a node added again does not write to readonly layouts", async () => {
    const given = reactive({ nodes: { node1: { x: 0, y: 0 }, node2: { x: 100, y: 0 } } })
    const { canvas, state } = await mountGraph(
      { nodes: { node1: { name: "Node 1" }, node2: { name: "Node 2" } }, layouts: { nodes: {} } },
      { layoutsListener: null }
    )
    state.layouts = readonly(given) as Layouts
    await nextTick()
    const node2 = state.nodes.node2
    delete state.nodes.node2
    await nextTick()
    state.nodes.node2 = node2
    await nextTick()

    await drag(canvas, at(100, 0), at(150, 50))

    expect(given.nodes.node2).toEqual({ x: 100, y: 0 })
  })

  test("a node whose position is removed is drawn at the origin with its edges", async () => {
    const { screen, state } = await mountGraph({
      nodes: { node1: { name: "Node 1" }, node2: { name: "Node 2" } },
      edges: { edge1: { source: "node1", target: "node2" } },
      layouts: { nodes: { node1: { x: 50, y: 50 }, node2: { x: 100, y: 0 } } },
      // A handler that does not give the node a new position.
      configs: { view: { layoutHandler: { activate() {}, deactivate() {} } } },
    })
    // Once emitted, the layouts are the graph's own, so a removal reaches it.
    state.layouts.nodes.node2.x = 120
    await nextTick()
    delete state.layouts.nodes.node1
    await nextTick()

    const node = screen.container.querySelector(".v-ng-node")
    const edge = screen.container.querySelector(".v-ng-edge")
    expect(node?.getAttribute("transform")).toBe("translate(0 0)")
    expect(edge?.getAttribute("d")).toBe("M 0 0 L 120 0")
  })

  // A position the layout handler would not fix, given as it is.
  const invalidPositions = {
    missing: {},
    undefined: { node2: undefined },
    NaN: { node2: { x: NaN, y: NaN } },
  } as unknown as Record<string, Layouts["nodes"]>

  test.each(Object.keys(invalidPositions))(
    "a node with a %s position is drawn at the origin with its edges, label, focus ring and paths",
    async invalid => {
      const graph = {
        nodes,
        edges,
        paths: { path1: { edges: ["edge1", "edge3"] }, path2: { edges: ["edge3"] } },
        selectedNodes: ["node2"],
        configs: {
          ...configsWith("straight"),
          view: { layoutHandler: { activate() {}, deactivate() {} } },
          path: { visible: true, end: "edgeOfNode" },
        },
      }
      const others = { node1: before.nodes.node1, node3: before.nodes.node3 }

      const drawn = await mountGraph({
        ...graph,
        layouts: { nodes: { ...others, ...invalidPositions[invalid] } },
      })
      const atOrigin = await mountGraph({
        ...graph,
        layouts: { nodes: { ...others, node2: { x: 0, y: 0 } } },
      })

      expect(markupOf(drawn.screen.container)).toBe(markupOf(atOrigin.screen.container))
    }
  )
})
