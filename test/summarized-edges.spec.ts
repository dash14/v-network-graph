import { describe, expect, test } from "vitest"
import { userEvent } from "vitest/browser"
import { h } from "vue"
import { at, mountGraph } from "./helpers/graph"

const props = () => ({
  nodes: { node1: { name: "Node 1" }, node2: { name: "Node 2" } },
  edges: {
    edge1: { source: "node1", target: "node2" },
    edge2: { source: "node2", target: "node1" },
  },
  layouts: { nodes: { node1: { x: -100, y: 0 }, node2: { x: 100, y: 0 } } },
  configs: { edge: { selectable: true, summarize: () => true } },
})

// Records the states each slot gets.
const recordStates =
  (name: string) =>
  ({ hovered, selected }: { hovered: boolean; selected: boolean }) =>
    h("g", { class: name, "data-hovered": hovered, "data-selected": selected })

const slots = {
  "edge-overlay": recordStates("overlay"),
  "edges-label": recordStates("label"),
}

describe("the slots of summarized edges", () => {
  test.each(["overlay", "label"])(
    "the %s slot gets selected when an edge other than the first is",
    async name => {
      const { screen, state } = await mountGraph(props(), { slots })
      const slot = () => screen.container.querySelector(`g.${name}`)
      expect(slot()?.getAttribute("data-selected")).toBe("false")

      state.selectedEdges = ["edge2"]
      await expect.poll(() => slot()?.getAttribute("data-selected")).toBe("true")
      expect(screen.container.querySelector(".v-ng-line-summarized.selected")).not.toBeNull()
    }
  )

  test.each(["overlay", "label"])(
    "the %s slot gets hovered with the summarized line",
    async name => {
      const { screen, canvas } = await mountGraph(props(), { slots })
      const slot = () => screen.container.querySelector(`g.${name}`)
      expect(slot()?.getAttribute("data-hovered")).toBe("false")

      await userEvent.hover(canvas, { position: at(-50, 0) })
      await expect.poll(() => slot()?.getAttribute("data-hovered")).toBe("true")
      expect(screen.container.querySelector(".v-ng-line-summarized.hovered")).not.toBeNull()
    }
  )
})
