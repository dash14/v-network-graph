import { describe, expect, test, vi } from "vitest"
import { userEvent } from "vitest/browser"
import { h } from "vue"
import type { Edges, UserConfigs } from "@/index"
import { at, mountGraph } from "./helpers/graph"

const nodes = {
  node1: { name: "Node 1" },
  node2: { name: "Node 2" },
}

const layouts = {
  nodes: {
    node1: { x: -100, y: 0 },
    node2: { x: 100, y: 40 },
  },
}

const fractions = [0, 0.25, 0.5, 0.75, 1]

// Marks the points that the slot gets along the edge, to compare with the drawn line.
const slots = {
  "edge-overlay": ({
    length,
    pointAtLength,
  }: {
    length: number
    pointAtLength: (d: number) => { x: number; y: number }
  }) =>
    h(
      "g",
      { class: "overlay", "data-length": length },
      fractions.map(f => {
        const p = pointAtLength(length * f)
        return h("circle", { cx: p.x, cy: p.y, r: 1 })
      })
    ),
}

const cases: { name: string; edges: Edges; configs: UserConfigs; line: string }[] = [
  {
    name: "a straight edge",
    edges: { edge1: { source: "node1", target: "node2" } },
    configs: { edge: { margin: 4 } },
    line: ".v-ng-edge",
  },
  {
    name: "a curved edge",
    edges: {
      edge1: { source: "node1", target: "node2" },
      edge2: { source: "node1", target: "node2" },
    },
    configs: { edge: { type: "curve", gap: 40, margin: 4 } },
    line: '.v-ng-edge[data-edge-id="edge1"]',
  },
  {
    name: "a self-loop edge",
    edges: { edge1: { source: "node1", target: "node1" } },
    configs: { edge: { margin: 4 } },
    line: ".v-ng-edge",
  },
  {
    name: "summarized edges",
    edges: {
      edge1: { source: "node1", target: "node2" },
      edge2: { source: "node1", target: "node2" },
    },
    configs: { edge: { summarize: () => true } },
    line: ".v-ng-line-summarized [data-edge-id]",
  },
  {
    name: "summarized self-loop edges",
    edges: {
      edge1: { source: "node1", target: "node1" },
      edge2: { source: "node1", target: "node1" },
    },
    configs: { edge: { summarize: () => true } },
    line: ".v-ng-line-summarized [data-edge-id]",
  },
]

describe("edge overlay", () => {
  test.each(cases)(
    "gets the length of and the points along $name as drawn",
    async ({ edges, configs, line }) => {
      const { screen } = await mountGraph({ nodes, edges, layouts, configs }, { slots })
      const drawn = screen.container.querySelector<SVGGeometryElement>(line)!
      const overlay = screen.container.querySelector(".overlay")!
      const length = Number(overlay.getAttribute("data-length"))

      expect(length).toBeGreaterThan(0)
      expect(length).toBeCloseTo(drawn.getTotalLength(), 2)
      const points = [...overlay.querySelectorAll("circle")]
      fractions.forEach((f, i) => {
        const expected = drawn.getPointAtLength(length * f)
        expect(Number(points[i].getAttribute("cx"))).toBeCloseTo(expected.x, 2)
        expect(Number(points[i].getAttribute("cy"))).toBeCloseTo(expected.y, 2)
      })
    }
  )

  test("keeps the summarized stroke when only the hover changes", async () => {
    const width = vi.fn(() => 4)
    const { screen, canvas } = await mountGraph(
      {
        nodes,
        edges: {
          edge1: { source: "node1", target: "node2" },
          edge2: { source: "node1", target: "node2" },
        },
        layouts,
        configs: { edge: { summarize: () => true, summarized: { stroke: { width } } } },
      },
      { slots: { "edge-overlay": ({ hovered }) => h("g", { class: "overlay", hovered }) } }
    )
    const hovered = () => screen.container.querySelector(".overlay")?.getAttribute("hovered")
    // Counts once the graph has settled, so that no call left from mounting is put on the hover.
    await expect.poll(hovered).toBe("false")
    await new Promise(resolve => requestAnimationFrame(resolve))
    const calls = width.mock.calls.length

    // Hovering redraws the overlay with the new state.
    await userEvent.hover(canvas, { position: at(-50, 10) })
    await expect.poll(hovered).toBe("true")
    expect(width).toHaveBeenCalledTimes(calls)
  })
})
