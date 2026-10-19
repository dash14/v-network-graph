import { describe, expect, test } from "vitest"
import { userEvent } from "vitest/browser"
import { GridLayout } from "@/index"
import { at, drag, elementAt, mountGraph, payloadsOf } from "../helpers/graph"

const nodes = {
  node1: { name: "Node 1" },
  node2: { name: "Node 2" },
  node3: { name: "Node 3" },
}
const layouts = {
  nodes: {
    node1: { x: -100, y: 0 },
    node2: { x: 0, y: 0 },
    node3: { x: 100, y: 0 },
  },
}

describe("node selection", () => {
  const configs = { node: { selectable: true } }

  test("clicking a node selects only that node", async () => {
    const { canvas, state, events } = await mountGraph({ nodes, layouts, configs })

    await userEvent.click(canvas, { position: at(-100, 0) })
    expect(state.selectedNodes).toEqual(["node1"])

    await userEvent.click(canvas, { position: at(0, 0) })
    expect(state.selectedNodes).toEqual(["node2"])
    expect(payloadsOf(events, "node:select")).toEqual([["node1"], ["node2"]])
  })

  test("clicking with the shift key adds or removes a node", async () => {
    const { canvas, state } = await mountGraph({ nodes, layouts, configs })

    await userEvent.click(canvas, { position: at(-100, 0) })
    await userEvent.click(canvas, { position: at(0, 0), modifiers: ["Shift"] })
    expect(state.selectedNodes).toEqual(["node1", "node2"])

    await userEvent.click(canvas, { position: at(-100, 0), modifiers: ["Shift"] })
    expect(state.selectedNodes).toEqual(["node2"])
  })

  test("a number for selectable limits how many nodes can be selected", async () => {
    const { canvas, state } = await mountGraph({
      nodes,
      layouts,
      configs: { node: { selectable: 2 } },
    })

    for (const x of [-100, 0, 100]) {
      await userEvent.click(canvas, { position: at(x, 0), modifiers: ["Shift"] })
    }
    expect(state.selectedNodes).toEqual(["node1", "node2"])
  })

  test("clicking the background clears the selection", async () => {
    const { canvas, state } = await mountGraph({
      nodes,
      layouts,
      configs,
      selectedNodes: ["node1", "node2"],
    })

    await userEvent.click(canvas, { position: at(0, 100) })
    expect(state.selectedNodes).toEqual([])
  })

  test("a node that is not selectable is not selected", async () => {
    const { canvas, state, events } = await mountGraph({
      nodes,
      layouts,
      configs: { node: { selectable: node => node.name !== "Node 1" } },
    })

    await userEvent.click(canvas, { position: at(-100, 0) })
    expect(state.selectedNodes).toEqual([])
    expect(payloadsOf(events, "node:click")).toMatchObject([{ node: "node1" }])
  })
})

describe("node events", () => {
  test("a double click emits two clicks and a double click", async () => {
    const { canvas, events } = await mountGraph({ nodes, layouts })

    await userEvent.dblClick(canvas, { position: at(0, 0) })
    expect(payloadsOf(events, "node:click")).toMatchObject([{ node: "node2" }, { node: "node2" }])
    expect(payloadsOf(events, "node:dblclick")).toMatchObject([{ node: "node2" }])
  })

  test("hovering a node emits pointerover and pointerout, and applies the hover style", async () => {
    const { screen, canvas, events } = await mountGraph({
      nodes,
      layouts,
      configs: { node: { normal: { color: "#0000ff" }, hover: { color: "#ff0000" } } },
    })
    const circle = elementAt(screen.container, at(0, 0))
    expect(circle?.closest(".v-ng-node")).not.toBeNull()

    await userEvent.hover(canvas, { position: at(0, 0) })
    expect(payloadsOf(events, "node:pointerover")).toMatchObject([{ node: "node2" }])
    await expect.poll(() => circle?.getAttribute("fill")).toBe("#ff0000")

    await userEvent.hover(canvas, { position: at(0, 100) })
    expect(payloadsOf(events, "node:pointerout")).toMatchObject([{ node: "node2" }])
    await expect.poll(() => circle?.getAttribute("fill")).toBe("#0000ff")
  })

  test("a right click emits contextmenu", async () => {
    const { canvas, events } = await mountGraph({ nodes, layouts })

    await userEvent.click(canvas, { position: at(100, 0), button: "right" })
    expect(payloadsOf(events, "node:contextmenu")).toMatchObject([{ node: "node3" }])
  })
})

describe("node drag", () => {
  test("dragging a node updates the layouts and emits the drag events", async () => {
    const { canvas, state, events } = await mountGraph({ nodes, layouts })

    await drag(canvas, at(-100, 0), at(-50, 30))
    expect(state.layouts.nodes.node1).toEqual({ x: -50, y: 30 })
    expect(payloadsOf(events, "node:dragstart")).toHaveLength(1)
    expect(payloadsOf(events, "node:dragend")).toEqual([{ node1: { x: -50, y: 30 } }])
    expect(payloadsOf(events, "node:click")).toEqual([])
  })

  test("dragging a node moves it without a v-model on the layouts", async () => {
    const { screen, canvas } = await mountGraph({ nodes, layouts }, { bindLayouts: false })

    await drag(canvas, at(-100, 0), at(-50, 30))
    expect(elementAt(screen.container, at(-50, 30))?.closest(".v-ng-node")).not.toBeNull()
    expect(elementAt(screen.container, at(-100, 0))?.closest(".v-ng-node")).toBeNull()
  })

  test("dragging a selected node moves the other selected nodes with it", async () => {
    const { canvas, state } = await mountGraph({
      nodes,
      layouts,
      configs: { node: { selectable: true } },
      selectedNodes: ["node1", "node3"],
    })

    await drag(canvas, at(-100, 0), at(-100, 50))
    expect(state.layouts.nodes).toEqual({
      node1: { x: -100, y: 50 },
      node2: { x: 0, y: 0 },
      node3: { x: 100, y: 50 },
    })
  })

  test("a node that is not draggable stays in place", async () => {
    const { canvas, state, events } = await mountGraph({
      nodes,
      layouts,
      // Selectable, since a node that is neither draggable nor selectable lets the pointer through.
      configs: { node: { draggable: false, selectable: true } },
    })

    await drag(canvas, at(-100, 0), at(-50, 30))
    expect(payloadsOf(events, "node:pointerdown")).toMatchObject([{ node: "node1" }])
    expect(state.layouts.nodes.node1).toEqual({ x: -100, y: 0 })
    expect(payloadsOf(events, "node:dragstart")).toEqual([])
  })

  test("the grid layout snaps a dragged node to the grid", async () => {
    const { canvas, state } = await mountGraph({
      nodes,
      layouts,
      configs: { view: { layoutHandler: new GridLayout({ grid: 20 }) } },
    })

    // A point where flooring and rounding snap differently.
    await drag(canvas, at(-100, 0), at(-47, 33))
    expect(state.layouts.nodes.node1).toEqual({ x: -60, y: 20 })
  })
})
