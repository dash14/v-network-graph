import { describe, expect, test } from "vitest"
import { userEvent } from "vitest/browser"
import type { Edges, UserConfigs } from "@/index"
import { at, elementAt, mountGraph, payloadsOf } from "../helpers/graph"

const nodes = {
  node1: { name: "Node 1" },
  node2: { name: "Node 2" },
  node3: { name: "Node 3" },
}
const edges = {
  edge1: { source: "node1", target: "node2" },
  edge2: { source: "node2", target: "node3" },
}
const layouts = {
  nodes: {
    node1: { x: -200, y: 0 },
    node2: { x: 0, y: 0 },
    node3: { x: 200, y: 0 },
  },
}
// The middle points of the edges.
const edge1 = at(-100, 0)
const edge2 = at(100, 0)

describe("edge selection", () => {
  const configs = { node: { selectable: true }, edge: { selectable: true } }

  test("clicking an edge selects it and emits the edge", async () => {
    const { canvas, state, events } = await mountGraph({ nodes, edges, layouts, configs })

    await userEvent.click(canvas, { position: edge1 })
    expect(state.selectedEdges).toEqual(["edge1"])
    expect(payloadsOf(events, "edge:click")).toMatchObject([
      { edge: "edge1", edges: ["edge1"], summarized: false },
    ])
    expect(payloadsOf(events, "edge:select")).toEqual([["edge1"]])
  })

  test("clicking with the shift key adds or removes an edge", async () => {
    const { canvas, state } = await mountGraph({ nodes, edges, layouts, configs })

    await userEvent.click(canvas, { position: edge1 })
    await userEvent.click(canvas, { position: edge2, modifiers: ["Shift"] })
    expect(state.selectedEdges).toEqual(["edge1", "edge2"])

    await userEvent.click(canvas, { position: edge1, modifiers: ["Shift"] })
    expect(state.selectedEdges).toEqual(["edge2"])
  })

  test("selecting an edge clears the selected nodes, and the other way around", async () => {
    const { canvas, state } = await mountGraph({
      nodes,
      edges,
      layouts,
      configs,
      selectedNodes: ["node1"],
    })

    await userEvent.click(canvas, { position: edge1 })
    expect(state.selectedNodes).toEqual([])
    expect(state.selectedEdges).toEqual(["edge1"])

    await userEvent.click(canvas, { position: at(200, 0) })
    expect(state.selectedNodes).toEqual(["node3"])
    expect(state.selectedEdges).toEqual([])
  })

  test("clicking a summarized edge selects all of its edges", async () => {
    const { canvas, state, events } = await mountGraph({
      nodes,
      edges: { ...edges, edge3: { source: "node1", target: "node2" } },
      layouts,
      configs: { ...configs, edge: { ...configs.edge, summarize: () => true } },
    })

    await userEvent.click(canvas, { position: edge1 })
    expect(state.selectedEdges).toEqual(["edge1", "edge3"])
    expect(payloadsOf(events, "edge:click")).toMatchObject([
      { edges: ["edge1", "edge3"], summarized: true },
    ])
  })
})

describe("edge events", () => {
  test("hovering an edge emits pointerover and pointerout, and applies the hover style", async () => {
    const { screen, canvas, events } = await mountGraph({
      nodes,
      edges,
      layouts,
      configs: { edge: { normal: { color: "#0000ff" }, hover: { color: "#ff0000" } } },
    })
    const line = () => screen.container.querySelector('.v-ng-edge[data-edge-id="edge1"]')

    await userEvent.hover(canvas, { position: edge1 })
    expect(
      elementAt(screen.container, edge1)?.closest(".v-ng-edge, .v-ng-line-background")
    ).not.toBeNull()
    expect(payloadsOf(events, "edge:pointerover")).toMatchObject([{ edge: "edge1" }])
    await expect.poll(() => line()?.getAttribute("stroke")).toBe("#ff0000")

    await userEvent.hover(canvas, { position: at(0, 100) })
    expect(payloadsOf(events, "edge:pointerout")).toMatchObject([{ edge: "edge1" }])
    await expect.poll(() => line()?.getAttribute("stroke")).toBe("#0000ff")
  })

  test("a double click emits two clicks and a double click", async () => {
    const { canvas, events } = await mountGraph({ nodes, edges, layouts })

    await userEvent.dblClick(canvas, { position: edge2 })
    expect(payloadsOf(events, "edge:click")).toMatchObject([{ edge: "edge2" }, { edge: "edge2" }])
    expect(payloadsOf(events, "edge:dblclick")).toMatchObject([{ edge: "edge2" }])
  })

  test("a right click emits contextmenu", async () => {
    const { canvas, events } = await mountGraph({ nodes, edges, layouts })

    await userEvent.click(canvas, { position: edge2, button: "right" })
    expect(payloadsOf(events, "edge:contextmenu")).toMatchObject([{ edge: "edge2" }])
  })
})

describe("edge stroke", () => {
  test("zooming keeps the stroke and its animation of a straight edge the same on screen", async () => {
    const normal = { width: 2, dasharray: "4 2", animate: true, animationSpeed: 10 }
    const configs = { edge: { normal } }
    const { screen, state } = await mountGraph({ nodes, edges, layouts, configs, zoomLevel: 1 })
    const line = () =>
      screen.container.querySelector<SVGElement>('.v-ng-edge[data-edge-id="edge1"]')!
    const speed = () => line().style.getPropertyValue("--animation-speed")

    expect(line().classList).toContain("animate")
    expect(line().getAttribute("stroke-width")).toBe("2")
    expect(line().getAttribute("stroke-dasharray")).toBe("4 2")
    expect(speed()).toBe("60")

    state.zoomLevel = 2
    await expect.poll(() => line().getAttribute("stroke-width")).toBe("1")
    expect(line().getAttribute("stroke-dasharray")).toBe("2 1")
    expect(speed()).toBe("30")
  })
})

describe("edge hit area", () => {
  const pair = { node1: {}, node2: {} }
  const pairLayouts = { nodes: { node1: { x: -100, y: 0 }, node2: { x: 100, y: 0 } } }

  // Points outside the drawn line of width 2, within the 12 wide area that the edges are hit in.
  const cases: { name: string; edges: Edges; configs: UserConfigs; point: [number, number] }[] = [
    {
      name: "a straight edge",
      edges: { edge1: { source: "node1", target: "node2" } },
      configs: {},
      point: [0, 4],
    },
    {
      name: "a curved edge",
      edges: {
        edge1: { source: "node1", target: "node2" },
        edge2: { source: "node1", target: "node2" },
      },
      configs: { edge: { type: "curve", gap: 40 } },
      point: [0, -24],
    },
    {
      // The loop of node1 is drawn on its left, around (-122, 0) with a radius of 12.
      name: "a self-loop edge",
      edges: { edge1: { source: "node1", target: "node1" } },
      configs: {},
      point: [-138, 0],
    },
  ]

  test.each(cases)(
    "$name is hovered and clicked beside its line, with the pointer cursor",
    async ({ edges, configs, point }) => {
      const { screen, canvas, events, state } = await mountGraph({
        nodes: pair,
        edges,
        layouts: pairLayouts,
        configs: { ...configs, edge: { ...configs.edge, selectable: true } },
      })

      await userEvent.hover(canvas, { position: at(...point) })
      await expect
        .poll(() => payloadsOf(events, "edge:pointerover"))
        .toMatchObject([{ edge: "edge1" }])
      const hit = elementAt(screen.container, at(...point))!
      expect(getComputedStyle(hit).cursor).toBe("pointer")

      await userEvent.click(canvas, { position: at(...point) })
      await expect.poll(() => payloadsOf(events, "edge:click")).toMatchObject([{ edge: "edge1" }])
      expect(state.selectedEdges).toEqual(["edge1"])
    }
  )
})
