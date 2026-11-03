import { describe, expect, onTestFinished, test, vi } from "vitest"
import { userEvent } from "vitest/browser"
import { nextTick } from "vue"
import type { Position } from "@/index"
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

  // Plain events, since the selection follows the box only after a pause in the drag.
  test("the append type deselects the nodes that leave the box during the drag", async () => {
    const { canvas, graph, state } = await mountGraph({ nodes, layouts, configs })
    const svg = canvas.element()
    const rect = svg.getBoundingClientRect()
    const pointer = (type: string, target: EventTarget, { x, y }: { x: number; y: number }) =>
      target.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          pointerId: 1,
          isPrimary: true,
          clientX: rect.left + x,
          clientY: rect.top + y,
        })
      )

    graph.startBoxSelection()
    pointer("pointerdown", svg, at(-150, -50))
    pointer("pointermove", document, at(50, 50))
    await vi.waitFor(() => expect(state.selectedNodes).toEqual(["node1", "node2"]))
    pointer("pointermove", document, at(-50, 50))
    await vi.waitFor(() => expect(state.selectedNodes).toEqual(["node1"]))
    pointer("pointerup", document, at(-50, 50))
    expect(state.selectedNodes).toEqual(["node1"])
  })

  test("dragging the background without box selection does not select", async () => {
    const { canvas, state } = await mountGraph({ nodes, layouts, configs })

    await drag(canvas, at(-150, -50), at(50, 50))
    expect(state.selectedNodes).toEqual([])
  })

  test("the Escape key reaches the page after the graph unmounts in box selection", async () => {
    const { screen, graph } = await mountGraph({ nodes, layouts, configs })
    graph.startBoxSelection()
    screen.unmount()

    const input = document.createElement("input")
    document.body.appendChild(input)
    onTestFinished(() => input.remove())
    const keydown = vi.fn()
    input.addEventListener("keydown", keydown)
    input.focus()
    await userEvent.keyboard("{Escape}")
    expect(keydown).toHaveBeenCalledOnce()
  })
})

const modifier = /Mac OS/.test(navigator.userAgent) ? "Meta" : "Control"

/** Pointer events with ids, pressed on the <svg>, which box selection listens to. */
function pointersOnSvg(svg: Element) {
  const rect = svg.getBoundingClientRect()
  const dispatch = (type: string, target: EventTarget, pointerId: number, { x, y }: Position) =>
    target.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        pointerId,
        clientX: rect.left + x,
        clientY: rect.top + y,
      })
    )
  return {
    down: (pointerId: number, position: Position) =>
      dispatch("pointerdown", svg, pointerId, position),
    up: (pointerId: number, position: Position) =>
      dispatch("pointerup", document, pointerId, position),
  }
}

describe("box selection options", () => {
  test("the click stop ends the selection with a click, but not with the click after a drag", async () => {
    const { canvas, graph, state, events } = await mountGraph({ nodes, layouts, configs })

    graph.startBoxSelection({ stop: "click" })
    await drag(canvas, at(-150, -50), at(50, 50))
    expect(state.selectedNodes).toEqual(["node1", "node2"])
    expect(payloadsOf(events, "view:mode")).toEqual(["box-selection"])

    await userEvent.click(canvas, { position: at(0, 100) })
    expect(payloadsOf(events, "view:mode")).toEqual(["box-selection", "default"])
  })

  test("the click stop ignores a click while a pointer is pressed", async () => {
    const { canvas, graph, events } = await mountGraph({ nodes, layouts, configs })
    const pointers = pointersOnSvg(canvas.element())

    graph.startBoxSelection({ stop: "click" })
    pointers.down(1, at(0, 100))
    canvas.element().dispatchEvent(new MouseEvent("click", { bubbles: true }))
    pointers.up(1, at(0, 100))
    await nextTick()
    expect(payloadsOf(events, "view:mode")).toEqual(["box-selection"])
  })

  test("withShiftKey sets the type of a selection started with the shift key", async () => {
    const { canvas, graph, state } = await mountGraph({
      nodes,
      layouts,
      configs,
      selectedNodes: ["node2", "node3"],
    })

    graph.startBoxSelection({ stop: "manual", withShiftKey: "invert" })
    await drag(canvas, at(-150, -50), at(50, 50))
    expect(state.selectedNodes.toSorted()).toEqual(["node1", "node2"])

    await userEvent.keyboard("{Shift>}")
    await drag(canvas, at(-150, -50), at(50, 50))
    await userEvent.keyboard("{/Shift}")
    expect(state.selectedNodes).toEqual([])
  })

  test("pointers span the box between them", async () => {
    const { canvas, graph, state, events } = await mountGraph({ nodes, layouts, configs })
    const pointers = pointersOnSvg(canvas.element())

    graph.startBoxSelection()
    pointers.down(1, at(-150, -50))
    pointers.down(2, at(50, 50))
    // The first and the last pressed span it.
    pointers.down(3, at(0, 100))
    pointers.up(3, at(0, 100))
    pointers.up(2, at(50, 50))
    await nextTick()
    expect(state.selectedNodes).toEqual(["node1", "node2"])

    // The box is then from where the second pointer was released to the first.
    pointers.up(1, at(-50, -50))
    await nextTick()
    expect(state.selectedNodes).toEqual(["node2"])
    expect(payloadsOf(events, "view:mode")).toEqual(["box-selection", "default"])
  })

  test("starting the selection again changes its options", async () => {
    const { canvas, graph, events } = await mountGraph({ nodes, layouts, configs })

    graph.startBoxSelection({ stop: "manual" })
    graph.startBoxSelection()
    await drag(canvas, at(-150, -50), at(50, 50))
    expect(payloadsOf(events, "view:mode")).toEqual(["box-selection", "default"])
  })

  test("a number for selectable limits the nodes selected with a box", async () => {
    const { canvas, graph, state } = await mountGraph({
      nodes,
      layouts,
      configs: { node: { selectable: 1 } },
    })

    graph.startBoxSelection({ stop: "manual" })
    await drag(canvas, at(-150, -50), at(50, 50))
    expect(state.selectedNodes).toEqual(["node1"])

    graph.startBoxSelection({ stop: "manual", type: "invert" })
    await drag(canvas, at(-50, -50), at(150, 50))
    expect(state.selectedNodes).toEqual(["node1"])
  })

  test("a box leaves out the nodes that are not selectable", async () => {
    const { canvas, graph, state } = await mountGraph({
      nodes,
      layouts,
      configs: { node: { selectable: node => node.name !== "Node 2" } },
    })

    graph.startBoxSelection({ stop: "manual" })
    await drag(canvas, at(-150, -50), at(150, 50))
    expect(state.selectedNodes).toEqual(["node1", "node3"])

    graph.startBoxSelection({ type: "invert" })
    await drag(canvas, at(-150, -50), at(50, 50))
    expect(state.selectedNodes).toEqual(["node3"])
  })
})

describe("box selection keys", () => {
  const enabled = { ...configs, view: { boxSelectionEnabled: true } }

  test("the Escape key ends the selection, unless it is stopped manually", async () => {
    const { graph, events } = await mountGraph({ nodes, layouts, configs })

    graph.startBoxSelection({ stop: "manual" })
    await userEvent.keyboard("{Escape}")
    expect(payloadsOf(events, "view:mode")).toEqual(["box-selection"])

    graph.startBoxSelection()
    await userEvent.keyboard("{Escape}")
    expect(payloadsOf(events, "view:mode")).toEqual(["box-selection", "default"])
  })

  test("only the modifier key starts and ends the selection", async () => {
    const { events } = await mountGraph({ nodes, layouts, configs: enabled })

    await userEvent.keyboard("a")
    expect(payloadsOf(events, "view:mode")).toEqual([])

    await userEvent.keyboard(`{${modifier}>}a{/${modifier}}`)
    await nextTick()
    expect(payloadsOf(events, "view:mode")).toEqual(["box-selection", "default"])
  })

  test("releasing the modifier key during a drag ends the selection with the drag", async () => {
    const { canvas, state, events } = await mountGraph({ nodes, layouts, configs: enabled })
    const pointers = pointersOnSvg(canvas.element())

    await userEvent.keyboard(`{${modifier}>}`)
    pointers.down(1, at(-150, -50))
    await userEvent.keyboard(`{/${modifier}}`)
    await nextTick()
    expect(payloadsOf(events, "view:mode")).toEqual(["box-selection"])

    pointers.up(1, at(50, 50))
    await nextTick()
    expect(state.selectedNodes).toEqual(["node1", "node2"])
    expect(payloadsOf(events, "view:mode")).toEqual(["box-selection", "default"])
  })

  test("the modifier key keeps the context menu from opening", async () => {
    const { canvas } = await mountGraph({ nodes, layouts, configs: enabled })
    const contextmenu = () => {
      const event = new MouseEvent("contextmenu", { bubbles: true, cancelable: true })
      canvas.element().dispatchEvent(event)
      return event.defaultPrevented
    }

    await userEvent.keyboard(`{${modifier}>}`)
    expect(contextmenu()).toBe(true)
    await userEvent.keyboard(`{/${modifier}}`)
    expect(contextmenu()).toBe(false)
  })

  test("the modifier key follows boxSelectionEnabled as it changes", async () => {
    const { state, events } = await mountGraph({ nodes, layouts, configs })

    state.configs.view.boxSelectionEnabled = true
    await nextTick()
    await userEvent.keyboard(`{${modifier}>}{/${modifier}}`)
    await nextTick()
    expect(payloadsOf(events, "view:mode")).toEqual(["box-selection", "default"])

    state.configs.view.boxSelectionEnabled = false
    await nextTick()
    await userEvent.keyboard(`{${modifier}>}{/${modifier}}`)
    await nextTick()
    expect(payloadsOf(events, "view:mode")).toEqual(["box-selection", "default"])
  })
})
