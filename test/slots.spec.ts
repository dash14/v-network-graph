import { describe, expect, test } from "vitest"
import { render } from "vitest-browser-vue"
import { nextTick } from "vue"
import SlotGraph from "./slots/SlotGraph.vue"

describe("slots", () => {
  test("slot contents follow the state they read", async () => {
    const screen = await render(SlotGraph, { props: { color: "#ff0000", withNodeSlot: false } })
    const label = () => screen.container.querySelector(".stable text[data-node='node1']")
    expect(label()?.getAttribute("fill")).toBe("#ff0000")

    await screen.rerender({ color: "#0000ff" })
    await nextTick()
    expect(label()?.getAttribute("fill")).toBe("#0000ff")
  })

  test("a slot given or taken away later replaces the default rendering", async () => {
    const screen = await render(SlotGraph, { props: { color: "#ff0000", withNodeSlot: false } })
    const nodes = () => screen.container.querySelector(".dynamic .v-ng-layer-nodes")!
    expect(nodes().querySelector("rect[data-node='node1']")).toBeNull()
    expect(nodes().querySelector("circle")).not.toBeNull()

    await screen.rerender({ withNodeSlot: true })
    await nextTick()
    expect(nodes().querySelector("rect[data-node='node1']")).not.toBeNull()
    expect(nodes().querySelector("circle")).toBeNull()

    await screen.rerender({ withNodeSlot: false })
    await nextTick()
    expect(nodes().querySelector("rect[data-node='node1']")).toBeNull()
    expect(nodes().querySelector("circle")).not.toBeNull()
  })
})
