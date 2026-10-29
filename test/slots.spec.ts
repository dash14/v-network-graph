import { describe, expect, test } from "vitest"
import { render } from "vitest-browser-vue"
import { nextTick } from "vue"
import SlotGraph from "./slots/SlotGraph.vue"

function renderSlotGraph() {
  return render(SlotGraph, { props: { color: "#ff0000", withSlots: false } })
}

describe("slots", () => {
  test("slot contents follow the state they read", async () => {
    const screen = await renderSlotGraph()
    const label = () => screen.container.querySelector(".stable text[data-node='node1']")
    expect(label()?.getAttribute("fill")).toBe("#ff0000")

    await screen.rerender({ color: "#0000ff" })
    await nextTick()
    expect(label()?.getAttribute("fill")).toBe("#0000ff")
  })

  test("slots given or taken away later replace the default rendering", async () => {
    const screen = await renderSlotGraph()
    const graph = () => screen.container.querySelector(".dynamic")!
    const custom = () => ({
      node: graph().querySelectorAll(".v-ng-layer-nodes rect[data-node='node1']").length,
      label: graph().querySelectorAll(".v-ng-layer-node-labels text[data-node='node1']").length,
      edgeOverlay: graph().querySelectorAll(".custom-edge-overlay").length,
    })
    const none = { node: 0, label: 0, edgeOverlay: 0 }
    expect(custom()).toEqual(none)
    expect(graph().querySelectorAll(".v-ng-layer-nodes circle")).toHaveLength(2)

    await screen.rerender({ withSlots: true })
    await nextTick()
    expect(custom()).toEqual({ node: 1, label: 1, edgeOverlay: 1 })

    await screen.rerender({ withSlots: false })
    await nextTick()
    expect(custom()).toEqual(none)
    expect(graph().querySelectorAll(".v-ng-layer-nodes circle")).toHaveLength(2)
  })

  test("label and layer slots given or taken away later are drawn or removed", async () => {
    const screen = await renderSlotGraph()
    const graph = () => screen.container.querySelector(".labels")!
    const custom = () => ({
      edgeLabel: graph().querySelectorAll(".v-ng-layer-edge-labels .custom-edge-label").length,
      edgesLabel: graph().querySelectorAll(".v-ng-layer-edge-labels .custom-edges-label").length,
      layer: graph().querySelectorAll(".custom-layer").length,
      root: graph().querySelectorAll("svg.v-ng-canvas > .custom-root").length,
    })
    const none = { edgeLabel: 0, edgesLabel: 0, layer: 0, root: 0 }
    expect(custom()).toEqual(none)

    await screen.rerender({ withSlots: true })
    await nextTick()
    expect(custom()).toEqual({ edgeLabel: 1, edgesLabel: 1, layer: 1, root: 1 })

    await screen.rerender({ withSlots: false })
    await nextTick()
    expect(custom()).toEqual(none)
  })

  test("a node whose slot renders nothing gets the default shape and label", async () => {
    const screen = await render(SlotGraph, { props: { color: "#ff0000", withSlots: true } })
    const graph = screen.container.querySelector(".dynamic")!

    expect(graph.querySelectorAll(".v-ng-layer-nodes circle")).toHaveLength(1)
    const labels = [...graph.querySelectorAll(".v-ng-layer-node-labels text")].map(
      e => e.textContent
    )
    expect(labels).toEqual(["custom", "Node 2"])
  })
})
