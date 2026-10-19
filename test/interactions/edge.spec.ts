import { describe, expect, test } from "vitest"
import { userEvent } from "vitest/browser"
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
  test("zooming keeps the stroke of a straight edge the same on screen", async () => {
    const configs = { edge: { normal: { width: 2, dasharray: "4 2" } } }
    const { screen, state } = await mountGraph({ nodes, edges, layouts, configs, zoomLevel: 1 })
    const line = () => screen.container.querySelector("[data-edge-id='edge1']")!

    expect(line().getAttribute("stroke-width")).toBe("2")
    expect(line().getAttribute("stroke-dasharray")).toBe("4 2")

    state.zoomLevel = 2
    await expect.poll(() => line().getAttribute("stroke-width")).toBe("1")
    expect(line().getAttribute("stroke-dasharray")).toBe("2 1")
  })
})
