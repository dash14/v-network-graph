import { describe, expect, test } from "vitest"
import { userEvent } from "vitest/browser"
import type { Edges, UserConfigs } from "@/index"
import { at, mountGraph, payloadsOf } from "./helpers/graph"

const nodes = { node1: {}, node2: {} }
const layouts = { nodes: { node1: { x: -100, y: 0 }, node2: { x: 100, y: 0 } } }

// Points off the drawn line of width 2, within the 12 wide area the edges are hit in.
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

describe("edge pointer events", () => {
  test.each(cases)(
    "$name is clicked and hovered beside its line",
    async ({ edges, configs, point }) => {
      const { canvas, events, state } = await mountGraph({
        nodes,
        edges,
        layouts,
        configs: { ...configs, edge: { ...configs.edge, selectable: true } },
      })

      await userEvent.hover(canvas, { position: at(...point) })
      await expect.poll(() => payloadsOf(events, "edge:pointerover").length).toBeGreaterThan(0)

      await userEvent.click(canvas, { position: at(...point) })
      await expect.poll(() => payloadsOf(events, "edge:click").length).toBe(1)
      expect(state.selectedEdges).toEqual(["edge1"])
    }
  )
})
