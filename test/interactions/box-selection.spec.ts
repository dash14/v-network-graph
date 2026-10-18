import { describe, expect, test } from "vitest"
import { userEvent } from "vitest/browser"
import { at, drag, mountGraph, payloadsOf } from "../helpers/graph"

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
const configs = { node: { selectable: true } }

describe("box selection", () => {
  test("startBoxSelection selects the nodes in the dragged box", async () => {
    const { canvas, graph, state, events } = await mountGraph({ nodes, layouts, configs })

    graph.startBoxSelection()
    await drag(canvas, at(-150, -50), at(50, 50))
    expect(state.selectedNodes).toEqual(["node1", "node2"])
    expect(payloadsOf(events, "view:mode")).toEqual(["box-selection", "default"])
  })

  test("the invert type toggles the nodes in the box", async () => {
    const { canvas, graph, state } = await mountGraph({
      nodes,
      layouts,
      configs,
      selectedNodes: ["node2", "node3"],
    })

    graph.startBoxSelection({ type: "invert" })
    await drag(canvas, at(-150, -50), at(50, 50))
    expect(state.selectedNodes.toSorted()).toEqual(["node1", "node3"])
  })

  test("holding the modifier key selects with a box when enabled", async () => {
    const { canvas, state } = await mountGraph({
      nodes,
      layouts,
      configs: { ...configs, view: { boxSelectionEnabled: true } },
    })
    const modifier = /Mac OS/.test(navigator.userAgent) ? "Meta" : "Control"

    await userEvent.keyboard(`{${modifier}>}`)
    await drag(canvas, at(-50, -50), at(150, 50))
    await userEvent.keyboard(`{/${modifier}}`)
    expect(state.selectedNodes).toEqual(["node2", "node3"])
  })

  test("dragging the background without box selection does not select", async () => {
    const { canvas, state } = await mountGraph({ nodes, layouts, configs })

    await drag(canvas, at(-150, -50), at(50, 50))
    expect(state.selectedNodes).toEqual([])
  })
})
