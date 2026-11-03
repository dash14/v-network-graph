import { describe, expect, onTestFinished, test } from "vitest"
import { userEvent } from "vitest/browser"
import { nextTick } from "vue"
import { at, elementAt, mountGraph, payloadsOf, pointersOn } from "../helpers/graph"

const nodes = { node1: { name: "Node 1" } }
const layouts = { nodes: { node1: { x: 0, y: 0 } } }

describe("background", () => {
  test("a right click emits contextmenu and no click", async () => {
    const { canvas, events } = await mountGraph({ nodes, layouts })

    await userEvent.click(canvas, { position: at(0, 100), button: "right" })
    expect(payloadsOf(events, "view:contextmenu")).toHaveLength(1)
    expect(payloadsOf(events, "view:click")).toEqual([])

    await userEvent.click(canvas, { position: at(0, 100) })
    expect(payloadsOf(events, "view:click")).toHaveLength(1)
  })

  test("a double click emits two clicks and a double click", async () => {
    const { canvas, events } = await mountGraph({ nodes, layouts })

    await userEvent.dblClick(canvas, { position: at(0, 100) })
    expect(payloadsOf(events, "view:click")).toHaveLength(2)
    expect(payloadsOf(events, "view:dblclick")).toHaveLength(1)
  })

  test("a click with the shift key keeps the nodes selected", async () => {
    const { canvas, state, events } = await mountGraph({
      nodes,
      layouts,
      configs: { node: { selectable: true } },
      selectedNodes: ["node1"],
    })

    await userEvent.click(canvas, { position: at(0, 100), modifiers: ["Shift"] })
    expect(state.selectedNodes).toEqual(["node1"])
    expect(payloadsOf(events, "view:click")).toEqual([])
  })

  test("two pointers make a click when both are released", async () => {
    const { screen, events } = await mountGraph({ nodes, layouts })
    const pointers = pointersOn(screen.container)

    pointers.down(1, at(-50, 100))
    pointers.down(2, at(50, 100))
    pointers.up(1, at(-50, 100))
    expect(payloadsOf(events, "view:click")).toEqual([])

    pointers.up(2, at(50, 100))
    expect(payloadsOf(events, "view:click")).toHaveLength(1)
  })

  test("a context menu opened without a press emits contextmenu", async () => {
    const { canvas, events } = await mountGraph({ nodes, layouts })

    canvas.element().dispatchEvent(new MouseEvent("contextmenu", { bubbles: true }))
    expect(payloadsOf(events, "view:contextmenu")).toHaveLength(1)
  })

  test("the wheel does not scroll the page while it zooms the graph", async () => {
    const { canvas, state } = await mountGraph({ nodes, layouts })
    const wheel = () => {
      const event = new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: 1 })
      canvas.element().dispatchEvent(event)
      return event.defaultPrevented
    }
    expect(wheel()).toBe(true)

    state.configs.view.zoomEnabled = false
    await nextTick()
    expect(wheel()).toBe(false)

    state.configs.view.zoomEnabled = true
    await nextTick()
    expect(wheel()).toBe(true)
  })
})

describe("unmounting", () => {
  // Each kind takes the pointer on its own, as a press on one blocks the others.
  test.each([
    { name: "the background", position: at(0, 100), pathVisible: false },
    { name: "a node", position: at(-100, 0), pathVisible: false },
    { name: "an edge", position: at(0, 0), pathVisible: false },
    { name: "a path", position: at(0, 0), pathVisible: true },
  ])(
    "a pointer pressed on $name when the graph unmounts is released without the graph",
    async ({ position, pathVisible }) => {
      const { screen, events } = await mountGraph({
        nodes: { node1: { name: "Node 1" }, node2: { name: "Node 2" } },
        edges: { edge1: { source: "node1", target: "node2" } },
        paths: { path1: { edges: ["edge1"] } },
        layouts: { nodes: { node1: { x: -100, y: 0 }, node2: { x: 100, y: 0 } } },
        configs: { path: { visible: pathVisible, clickable: true } },
      })
      const pointer = { bubbles: true, pointerId: 2 }
      elementAt(screen.container, position)!.dispatchEvent(new PointerEvent("pointerdown", pointer))

      const errors: unknown[] = []
      const onError = (event: ErrorEvent) => {
        event.preventDefault()
        errors.push(event.error)
      }
      window.addEventListener("error", onError)
      onTestFinished(() => window.removeEventListener("error", onError))

      screen.unmount()
      const unloaded = events.length
      document.dispatchEvent(new PointerEvent("pointerup", pointer))
      expect(events.slice(unloaded)).toEqual([])
      expect(errors).toEqual([])
    }
  )
})
