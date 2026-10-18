import { describe, expect, test } from "vitest"
import { userEvent } from "vitest/browser"
import { at, mountGraph, payloadsOf } from "../helpers/graph"

const nodes = {
  node1: { name: "Node 1" },
  node2: { name: "Node 2" },
  node3: { name: "Node 3" },
}
const edges = {
  edge1: { source: "node1", target: "node2" },
  edge2: { source: "node2", target: "node3" },
}
const paths = {
  path1: { edges: ["edge1", "edge2"] },
}
const layouts = {
  nodes: {
    node1: { x: -200, y: 0 },
    node2: { x: 0, y: 0 },
    node3: { x: 200, y: 0 },
  },
}
const onPath = at(-100, 0)

describe("path", () => {
  test("clicking a selectable path selects it and emits the path", async () => {
    const { canvas, state, events } = await mountGraph({
      nodes,
      edges,
      paths,
      layouts,
      configs: { path: { visible: true, clickable: true, selectable: true } },
    })

    await userEvent.click(canvas, { position: onPath })
    expect(state.selectedPaths).toEqual(["path1"])
    expect(payloadsOf(events, "path:click")).toMatchObject([{ path: "path1" }])
    expect(payloadsOf(events, "path:select")).toEqual([["path1"]])
    expect(payloadsOf(events, "edge:click")).toEqual([])
  })

  test("hovering a hoverable path emits pointerover and pointerout", async () => {
    const { canvas, events } = await mountGraph({
      nodes,
      edges,
      paths,
      layouts,
      configs: { path: { visible: true, hoverable: true } },
    })

    await userEvent.hover(canvas, { position: onPath })
    expect(payloadsOf(events, "path:pointerover")).toMatchObject([{ path: "path1" }])

    await userEvent.hover(canvas, { position: at(0, 100) })
    expect(payloadsOf(events, "path:pointerout")).toMatchObject([{ path: "path1" }])
  })
})
