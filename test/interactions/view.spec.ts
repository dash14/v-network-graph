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

  test.each([
    { name: "the background", position: at(0, 100), contextmenu: "view:contextmenu" as const },
    { name: "a path", position: at(0, 0), contextmenu: "path:contextmenu" as const },
  ])(
    "a right click on $name emits no click when the context menu comes after the release",
    async ({ position, contextmenu }) => {
      const { screen, events } = await mountGraph({
        nodes: { node1: { name: "Node 1" }, node2: { name: "Node 2" } },
        edges: { edge1: { source: "node1", target: "node2" } },
        paths: { path1: { edges: ["edge1"] } },
        layouts: { nodes: { node1: { x: -100, y: 0 }, node2: { x: 100, y: 0 } } },
        configs: { path: { visible: true, clickable: true } },
      })
      const pointers = pointersOn(screen.container)

      // The order on Windows.
      pointers.down(1, position, { button: 2, buttons: 2 })
      pointers.up(1, position, { button: 2 })
      elementAt(screen.container, position)!.dispatchEvent(
        new MouseEvent("contextmenu", { bubbles: true, cancelable: true, button: 2 })
      )
      await nextTick()
      expect(payloadsOf(events, "view:click")).toEqual([])
      expect(payloadsOf(events, contextmenu)).toHaveLength(1)
    }
  )

  test.each([
    { name: "before", os: "macOS" },
    { name: "after", os: "Windows" },
  ])(
    "a press that releases the right button last, with the context menu on a node $name the release, leaves the next click",
    async ({ os }) => {
      const { screen, events } = await mountGraph({ nodes, layouts })
      const pointers = pointersOn(screen.container)
      const background = at(0, 100)
      const node = at(0, 0)
      const contextmenu = () =>
        elementAt(screen.container, node)!.dispatchEvent(
          new MouseEvent("contextmenu", { bubbles: true, cancelable: true, button: 2 })
        )

      // The right button joins the left one's press, and is released last.
      pointers.down(1, background, { button: 0, buttons: 1 })
      pointers.move(1, node, { button: 2, buttons: 3 })
      if (os === "macOS") contextmenu()
      pointers.move(1, node, { button: 0, buttons: 2 })
      pointers.up(1, node, { button: 2, buttons: 0 })
      if (os === "Windows") contextmenu()
      await nextTick()
      expect(payloadsOf(events, "node:contextmenu")).toHaveLength(1)
      expect(payloadsOf(events, "view:click")).toEqual([])

      pointers.down(1, background, { button: 0, buttons: 1 })
      pointers.up(1, background, { button: 0, buttons: 0 })
      expect(payloadsOf(events, "view:click")).toHaveLength(1)
    }
  )

  test("a right click while a finger holds the background leaves the tap to the finger", async () => {
    const { screen, events } = await mountGraph({ nodes, layouts })
    const pointers = pointersOn(screen.container)
    const position = at(0, 100)

    pointers.down(1, position, { pointerType: "touch" })
    pointers.down(2, position, { button: 2, buttons: 2 })
    pointers.up(2, position, { button: 2 })
    expect(payloadsOf(events, "view:click")).toEqual([])

    pointers.up(1, position, { pointerType: "touch" })
    expect(payloadsOf(events, "view:click")).toHaveLength(1)
  })

  test("a long press that opens the context menu emits no click", async () => {
    const { screen, events } = await mountGraph({ nodes, layouts })
    const pointers = pointersOn(screen.container)
    const position = at(0, 100)

    pointers.down(1, position, { pointerType: "touch" })
    elementAt(screen.container, position)!.dispatchEvent(
      new MouseEvent("contextmenu", { bubbles: true, cancelable: true })
    )
    pointers.up(1, position, { pointerType: "touch" })
    await nextTick()
    expect(payloadsOf(events, "view:contextmenu")).toHaveLength(1)
    expect(payloadsOf(events, "view:click")).toEqual([])
  })

  test("a double click emits two clicks and a double click", async () => {
    const { canvas, events } = await mountGraph({ nodes, layouts })

    await userEvent.dblClick(canvas, { position: at(0, 100) })
    expect(payloadsOf(events, "view:click")).toHaveLength(2)
    expect(payloadsOf(events, "view:dblclick")).toHaveLength(1)
  })

  test("a double click with the shift key keeps the nodes selected and emits no clicks", async () => {
    const { canvas, state, events } = await mountGraph({
      nodes,
      layouts,
      configs: { node: { selectable: true } },
      selectedNodes: ["node1"],
    })

    await userEvent.dblClick(canvas, { position: at(0, 100), modifiers: ["Shift"] })
    expect(state.selectedNodes).toEqual(["node1"])
    expect(payloadsOf(events, "view:click")).toEqual([])
    expect(payloadsOf(events, "view:dblclick")).toEqual([])
  })

  test("a double click with the shift key deselects the nodes with node.selectable 1", async () => {
    const { canvas, state, events } = await mountGraph({
      nodes,
      layouts,
      configs: { node: { selectable: 1 } },
      selectedNodes: ["node1"],
    })

    await userEvent.dblClick(canvas, { position: at(0, 100), modifiers: ["Shift"] })
    expect(state.selectedNodes).toEqual([])
    expect(payloadsOf(events, "view:click")).toHaveLength(2)
    expect(payloadsOf(events, "view:dblclick")).toHaveLength(1)
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

  test("a cancelled press emits no click, and the next tap does", async () => {
    const { screen, events } = await mountGraph({ nodes, layouts })
    const pointers = pointersOn(screen.container)
    const touch = { pointerType: "touch" }

    pointers.down(1, at(0, 100), touch)
    pointers.move(1, at(0, 101), touch)
    pointers.cancel(1)
    expect(payloadsOf(events, "view:click")).toEqual([])

    pointers.down(2, at(0, 100), touch)
    pointers.up(2, at(0, 100), touch)
    expect(payloadsOf(events, "view:click")).toHaveLength(1)
  })

  test("a cancelled pointer leaves no click to the one released after it", async () => {
    const { screen, events } = await mountGraph({ nodes, layouts })
    const pointers = pointersOn(screen.container)
    const touch = { pointerType: "touch" }

    pointers.down(1, at(-50, 100), touch)
    pointers.down(2, at(50, 100), touch)
    pointers.cancel(1)
    pointers.up(2, at(50, 100), touch)
    expect(payloadsOf(events, "view:click")).toEqual([])
  })

  test("a cancel of a pointer not pressed on the background leaves the click", async () => {
    const { screen, events } = await mountGraph({ nodes, layouts })
    const pointers = pointersOn(screen.container)

    pointers.down(1, at(0, 100))
    pointers.cancel(9)
    pointers.up(1, at(0, 100))
    expect(payloadsOf(events, "view:click")).toHaveLength(1)
  })

  test("a drag with one pointer emits no click after a tap with another", async () => {
    const { screen, events } = await mountGraph({ nodes, layouts })
    const pointers = pointersOn(screen.container)
    const touch = { pointerType: "touch" }

    pointers.down(1, at(-50, 100), touch)
    for (let x = -49; x <= -40; x++) pointers.move(1, at(x, 100), touch)
    pointers.down(2, at(50, 100), touch)
    pointers.up(2, at(50, 100), touch)
    pointers.move(1, at(-39, 100), touch)
    pointers.up(1, at(-39, 100), touch)
    expect(payloadsOf(events, "view:click")).toEqual([])
  })

  test("pointers each moved within the threshold make a click", async () => {
    const { screen, events } = await mountGraph({ nodes, layouts })
    const pointers = pointersOn(screen.container)
    const touch = { pointerType: "touch" }

    pointers.down(1, at(-50, 100), touch)
    pointers.down(2, at(50, 100), touch)
    for (let d = 1; d <= 4; d++) {
      pointers.move(1, at(-50 + d, 100), touch)
      pointers.move(2, at(50 + d, 100), touch)
    }
    // Nor do the moves of a pointer not pressed on the background count.
    for (let x = 1; x <= 10; x++) pointers.move(9, at(x, 150))
    pointers.up(1, at(-46, 100), touch)
    pointers.up(2, at(54, 100), touch)
    expect(payloadsOf(events, "view:click")).toHaveLength(1)
  })

  test("a tap of a first finger ends the presses whose release did not come", async () => {
    const { screen, events } = await mountGraph({ nodes, layouts })
    const pointers = pointersOn(screen.container)
    const first = { pointerType: "touch", isPrimary: true }

    // Pointer 1 is released where the document gets no event, such as over an iframe.
    pointers.down(1, at(0, 100), first)
    pointers.down(2, at(0, 100), first)
    pointers.up(2, at(0, 100), first)
    expect(payloadsOf(events, "view:click")).toHaveLength(1)
  })

  test("a mouse moved with no button down ends the press whose release did not come", async () => {
    const { screen, events } = await mountGraph({ nodes, layouts })
    const pointers = pointersOn(screen.container)
    const mouse = { pointerType: "mouse", isPrimary: true }

    pointers.down(1, at(0, 100), { ...mouse, buttons: 1 })
    pointers.move(1, at(0, 150), { ...mouse, buttons: 0 })
    expect(payloadsOf(events, "view:click")).toEqual([])

    pointers.down(2, at(0, 100), { pointerType: "touch" })
    pointers.up(2, at(0, 100), { pointerType: "touch" })
    expect(payloadsOf(events, "view:click")).toHaveLength(1)
  })

  test("the moves of a press whose release did not come do not hold back the next click", async () => {
    const { screen, events } = await mountGraph({ nodes, layouts })
    const pointers = pointersOn(screen.container)
    const first = { pointerType: "touch", isPrimary: true }

    pointers.down(1, at(0, 150), { pointerType: "pen", isPrimary: true })
    pointers.down(2, at(-50, 100), first)
    for (let x = -49; x <= -40; x++) pointers.move(2, at(x, 100), first)
    pointers.down(3, at(50, 100), first)
    pointers.up(3, at(50, 100), first)
    pointers.up(1, at(0, 150), { pointerType: "pen" })
    expect(payloadsOf(events, "view:click")).toHaveLength(1)
  })

  test("a second finger leaves the first one pressed", async () => {
    const { screen, events } = await mountGraph({ nodes, layouts })
    const pointers = pointersOn(screen.container)

    pointers.down(1, at(-50, 100), { pointerType: "touch", isPrimary: true })
    pointers.down(2, at(50, 100), { pointerType: "touch", isPrimary: false })
    // Nor does a mouse, which is primary for its own type.
    pointers.down(3, at(0, 150), { pointerType: "mouse", isPrimary: true })
    pointers.up(3, at(0, 150), { pointerType: "mouse" })
    pointers.up(2, at(50, 100), { pointerType: "touch" })
    expect(payloadsOf(events, "view:click")).toEqual([])

    pointers.up(1, at(-50, 100), { pointerType: "touch" })
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

describe("background clicks", () => {
  test("a click, a double click and a context menu carry their events", async () => {
    const { canvas, events } = await mountGraph({ nodes, layouts })

    await userEvent.dblClick(canvas, { position: at(0, 100) })
    await userEvent.click(canvas, { position: at(0, 100), button: "right" })
    const withEvent = { event: expect.any(MouseEvent) }
    expect(payloadsOf(events, "view:click")).toEqual([withEvent, withEvent])
    expect(payloadsOf(events, "view:dblclick")).toEqual([withEvent])
    expect(payloadsOf(events, "view:contextmenu")).toEqual([withEvent])
  })

  test("a press moved more than 3 times is a drag, not a click", async () => {
    const { screen, events } = await mountGraph({ nodes, layouts })
    const pointers = pointersOn(screen.container)
    const press = (moves: number) => {
      pointers.down(1, at(0, 100))
      for (let i = 1; i <= moves; i++) pointers.move(1, at(i, 100))
      pointers.up(1, at(moves, 100))
    }

    press(3)
    expect(payloadsOf(events, "view:click")).toHaveLength(1)
    press(4)
    expect(payloadsOf(events, "view:click")).toHaveLength(1)
  })

  test("a click with the shift key is a click when nothing is selected", async () => {
    const { canvas, events } = await mountGraph({
      nodes,
      layouts,
      configs: { node: { selectable: true } },
    })

    await userEvent.click(canvas, { position: at(0, 100), modifiers: ["Shift"] })
    expect(payloadsOf(events, "view:click")).toHaveLength(1)
  })

  test("the wheel scrolls the page with the zoom disabled from the start", async () => {
    const { canvas } = await mountGraph({
      nodes,
      layouts,
      configs: { view: { zoomEnabled: false } },
    })
    const event = new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: 1 })
    canvas.element().dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
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
