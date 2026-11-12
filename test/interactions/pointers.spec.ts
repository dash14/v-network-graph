import { afterEach, describe, expect, test, vi } from "vitest"
import { userEvent } from "vitest/browser"
import { nextTick } from "vue"
import type { Edge, Node, Paths, UserConfigs } from "@/index"
import type { GraphProps } from "../helpers/graph"
import { at, catchErrors, elementAt, mountGraph, payloadsOf, pointersOn } from "../helpers/graph"

// Within the viewport, where the pointers can find what they press.
const node1 = at(-100, 0)
const node2 = at(0, 0)
const node3 = at(100, 0)
// The middle points of the edges, and of the paths along them.
const edge1 = at(-50, 0)
const edge2 = at(50, 0)

const graph = (configs: UserConfigs = {}): GraphProps => ({
  nodes: { node1: { name: "Node 1" }, node2: { name: "Node 2" }, node3: { name: "Node 3" } },
  edges: {
    edge1: { source: "node1", target: "node2" },
    edge2: { source: "node2", target: "node3" },
  },
  paths: { path1: { edges: ["edge1"] }, path2: { edges: ["edge2"] } },
  layouts: {
    nodes: { node1: { x: -100, y: 0 }, node2: { x: 0, y: 0 }, node3: { x: 100, y: 0 } },
  },
  configs,
})

const selectable = { selectable: true }

/** Moves a pressed pointer to a point in steps, enough of them to be taken as a drag. */
function moveTo(
  pointers: ReturnType<typeof pointersOn>,
  pointerId: number,
  from: { x: number; y: number },
  to: { x: number; y: number },
  steps = 5
) {
  for (let i = 1; i <= steps; i++) {
    pointers.move(pointerId, {
      x: from.x + ((to.x - from.x) * i) / steps,
      y: from.y + ((to.y - from.y) * i) / steps,
    })
  }
}

const types = (events: { type: string }[]) => events.map(e => e.type)

afterEach(() => {
  vi.restoreAllMocks()
})

describe("nodes", () => {
  test("a second pointer on a selected node takes it from the nodes following the first", async () => {
    const props = graph({ node: selectable })
    props.selectedNodes = ["node1", "node2", "node3"]
    const { screen, state } = await mountGraph(props)
    const pointers = pointersOn(screen.container)

    pointers.down(1, node1)
    pointers.down(2, node2)
    moveTo(pointers, 1, node1, at(-100, 50))
    pointers.up(1, at(-100, 50))
    pointers.up(2, node2)

    expect(state.layouts.nodes).toEqual({
      node1: { x: -100, y: 50 },
      node2: { x: 0, y: 0 },
      node3: { x: 100, y: 50 },
    })
  })

  test("the selected nodes stop following a node that is deselected during its drag", async () => {
    const props = graph({ node: selectable })
    props.selectedNodes = ["node1", "node3"]
    const { screen, state } = await mountGraph(props)
    const pointers = pointersOn(screen.container)

    pointers.down(1, node1)
    moveTo(pointers, 1, node1, at(-100, 50))
    state.selectedNodes = []
    await nextTick()
    moveTo(pointers, 1, at(-100, 50), at(-100, 100))
    pointers.up(1, at(-100, 100))

    expect(state.layouts.nodes.node1).toEqual({ x: -100, y: 100 })
    expect(state.layouts.nodes.node3).toEqual({ x: 100, y: 50 })
  })

  test("a node deselected during the drag it follows ends its drag where it stopped", async () => {
    const props = graph({ node: selectable })
    props.selectedNodes = ["node1", "node2", "node3"]
    const { screen, state, events } = await mountGraph(props)
    const pointers = pointersOn(screen.container)

    pointers.down(1, node1)
    moveTo(pointers, 1, node1, at(-100, 50))
    state.selectedNodes = ["node1", "node3"]
    await nextTick()
    expect(payloadsOf(events, "node:dragend")).toEqual([{ node2: { x: 0, y: 50 } }])
    expect(screen.container.querySelector("svg.v-ng-canvas.dragging")).not.toBeNull()

    moveTo(pointers, 1, at(-100, 50), at(-100, 100))
    pointers.up(1, at(-100, 100))
    expect(payloadsOf(events, "node:dragend")).toEqual([
      { node2: { x: 0, y: 50 } },
      { node1: { x: -100, y: 100 }, node3: { x: 100, y: 100 } },
    ])
  })

  test("a node deselected after the node it follows became undraggable ends where it stopped", async () => {
    const props = graph({ node: { selectable: true, draggable: node => !node.locked } })
    props.selectedNodes = ["node1", "node3"]
    const { screen, state, events } = await mountGraph(props)
    const pointers = pointersOn(screen.container)

    pointers.down(1, node1)
    moveTo(pointers, 1, node1, at(-100, 50))
    state.nodes.node1.locked = true
    await nextTick()
    moveTo(pointers, 1, at(-100, 50), at(-100, 100))
    // The first change only rebases the following nodes, and the second ends a drag.
    state.selectedNodes = ["node1", "node3", "node2"]
    await nextTick()
    state.selectedNodes = ["node1", "node2"]
    await nextTick()
    pointers.up(1, at(-100, 100))

    expect(payloadsOf(events, "node:dragend")).toEqual([
      { node3: { x: 100, y: 50 } },
      { node1: { x: -100, y: 50 }, node2: { x: 0, y: 0 } },
    ])
  })

  test("a node selected during a drag starts its own drag where it is", async () => {
    const props = graph({ node: selectable })
    props.selectedNodes = ["node1"]
    const { screen, state, events } = await mountGraph(props)
    const pointers = pointersOn(screen.container)

    pointers.down(1, node1)
    moveTo(pointers, 1, node1, at(-100, 50))
    state.selectedNodes = ["node1", "node3"]
    await nextTick()
    expect(payloadsOf(events, "node:dragstart")).toEqual([
      { node1: { x: -100, y: 0 } },
      { node3: { x: 100, y: 0 } },
    ])

    moveTo(pointers, 1, at(-100, 50), at(-100, 100))
    pointers.up(1, at(-100, 100))
    expect(payloadsOf(events, "node:dragend")).toEqual([
      { node1: { x: -100, y: 100 }, node3: { x: 100, y: 50 } },
    ])
  })

  test("a following node held by another pointer ends the drag it followed", async () => {
    const props = graph({ node: selectable })
    props.selectedNodes = ["node1", "node3"]
    const { screen, events } = await mountGraph(props)
    const pointers = pointersOn(screen.container)

    pointers.down(1, node1)
    moveTo(pointers, 1, node1, at(-100, 50))
    await nextTick()
    pointers.down(2, at(100, 50))
    expect(payloadsOf(events, "node:dragend")).toEqual([{ node3: { x: 100, y: 50 } }])

    pointers.up(1, at(-100, 50))
    pointers.up(2, at(100, 50))
    expect(payloadsOf(events, "node:dragstart")).toEqual([
      { node1: { x: -100, y: 0 }, node3: { x: 100, y: 0 } },
    ])
    expect(payloadsOf(events, "node:dragend")).toEqual([
      { node3: { x: 100, y: 50 } },
      { node1: { x: -100, y: 50 } },
    ])
  })

  test("the nodes following a released pointer start a drag again with the next one", async () => {
    const props = graph({ node: selectable })
    props.selectedNodes = ["node1", "node2", "node3"]
    const { screen, events } = await mountGraph(props)
    const pointers = pointersOn(screen.container)

    pointers.down(1, node1)
    pointers.down(2, node2)
    moveTo(pointers, 1, node1, at(-100, 50))
    moveTo(pointers, 2, node2, at(0, -50))
    pointers.up(1, at(-100, 50))
    moveTo(pointers, 2, at(0, -50), at(0, -100))
    pointers.up(2, at(0, -100))

    expect(payloadsOf(events, "node:dragstart")).toEqual([
      { node1: { x: -100, y: 0 }, node3: { x: 100, y: 0 } },
      { node2: { x: 0, y: 0 } },
      { node1: { x: -100, y: 50 }, node3: { x: 100, y: 50 } },
    ])
    expect(payloadsOf(events, "node:dragend")).toEqual([
      { node1: { x: -100, y: 50 }, node3: { x: 100, y: 50 } },
      { node2: { x: 0, y: -100 }, node1: { x: -100, y: 0 }, node3: { x: 100, y: 0 } },
    ])
  })

  test("the canvas stays in the dragging state until the last pointer dragging a node is released", async () => {
    const { screen } = await mountGraph(graph())
    const canvas = screen.container.querySelector("svg.v-ng-canvas")!
    const pointers = pointersOn(screen.container)

    pointers.down(1, node1)
    pointers.down(3, node3)
    moveTo(pointers, 1, node1, at(-100, 50))
    moveTo(pointers, 3, node3, at(100, 50))
    pointers.up(1, at(-100, 50))
    await nextTick()
    expect(canvas.classList.contains("dragging")).toBe(true)

    pointers.up(3, at(100, 50))
    await nextTick()
    expect(canvas.classList.contains("dragging")).toBe(false)
  })

  test("pointers on several nodes drag them each, with the selected ones following theirs", async () => {
    const props = graph({ node: selectable })
    props.selectedNodes = ["node2"]
    const { screen, state } = await mountGraph(props)
    const pointers = pointersOn(screen.container)

    pointers.down(1, node1)
    pointers.down(3, node3)
    moveTo(pointers, 1, node1, at(-100, 50))
    pointers.up(1, at(-100, 50))
    pointers.down(2, node2)
    moveTo(pointers, 3, node3, at(100, 50))
    pointers.up(3, at(100, 50))
    pointers.up(2, node2)

    expect(state.layouts.nodes).toEqual({
      node1: { x: -100, y: 50 },
      node2: { x: 0, y: 0 },
      node3: { x: 100, y: 50 },
    })
    expect(state.selectedNodes).toEqual(["node2"])
  })

  test("a tap with a finger on a selected node adds the tapped node to the selection", async () => {
    const props = graph({ node: selectable })
    props.selectedNodes = ["node1"]
    const { screen, state } = await mountGraph(props)
    const pointers = pointersOn(screen.container)

    pointers.down(1, node1)
    pointers.down(2, node3)
    pointers.up(2, node3)
    pointers.up(1, node1)
    await nextTick()

    expect(state.selectedNodes).toEqual(["node1", "node3"])
  })

  test("the moves and releases of pointers not pressed on a node are ignored", async () => {
    const { screen, events } = await mountGraph(graph())
    const pointers = pointersOn(screen.container)

    pointers.down(1, node1)
    moveTo(pointers, 9, node1, at(-100, 50))
    pointers.up(9, at(-100, 50))
    pointers.cancel(9)
    expect(types(events)).toEqual(["node:pointerdown"])

    pointers.up(1, node1)
    expect(payloadsOf(events, "node:click")).toMatchObject([{ node: "node1" }])
  })

  test("a cancelled drag ends at the last position of the pointer", async () => {
    const { screen, state, events } = await mountGraph(graph())
    const pointers = pointersOn(screen.container)

    pointers.down(1, node1)
    moveTo(pointers, 1, node1, at(-100, 50))
    pointers.cancel(1)

    expect(payloadsOf(events, "node:dragend")).toEqual([{ node1: { x: -100, y: 50 } }])
    expect(payloadsOf(events, "node:pointerup")).toMatchObject([{ node: "node1" }])
    expect(payloadsOf(events, "node:click")).toEqual([])
    expect(state.layouts.nodes.node1).toEqual({ x: -100, y: 50 })
  })

  test("a cancelled press emits pointerup only, and leaves the nodes draggable", async () => {
    const { screen, events } = await mountGraph(graph())
    const pointers = pointersOn(screen.container)

    pointers.down(1, node1)
    pointers.cancel(1)
    expect(types(events)).toEqual(["node:pointerdown", "node:pointerup"])

    pointers.down(2, node2)
    moveTo(pointers, 2, node2, at(0, 50))
    expect(payloadsOf(events, "node:dragstart")).toHaveLength(1)
  })

  test("a press moved on an undraggable node emits pointerup without a drag or a click", async () => {
    const { screen, events } = await mountGraph(
      graph({ node: { draggable: false, selectable: true } })
    )
    const pointers = pointersOn(screen.container)

    pointers.down(1, node1)
    moveTo(pointers, 1, node1, at(-100, 50))
    pointers.up(1, at(-100, 50))
    expect(types(events)).toEqual(["node:pointerdown", "node:pointerup"])
  })

  test("a press moved on an undraggable node and cancelled emits no dragend", async () => {
    const { screen, state, events } = await mountGraph(
      graph({ node: { draggable: false, selectable: true } })
    )
    const pointers = pointersOn(screen.container)

    pointers.down(1, node1)
    moveTo(pointers, 1, node1, at(-100, 50))
    pointers.cancel(1)
    expect(types(events)).toEqual(["node:pointerdown", "node:pointerup"])
    expect(state.layouts.nodes.node1).toEqual({ x: -100, y: 0 })
  })

  test("a touch takes more moves than a mouse to start a drag", async () => {
    const { screen, events } = await mountGraph(graph())
    const pointers = pointersOn(screen.container)
    const touch = { pointerType: "touch" }

    pointers.down(1, node1, touch)
    for (let y = 1; y <= 6; y++) pointers.move(1, at(-100, y), touch)
    expect(payloadsOf(events, "node:dragstart")).toEqual([])

    pointers.move(1, at(-100, 7), touch)
    expect(payloadsOf(events, "node:dragstart")).toHaveLength(1)
  })

  test("a press moved up to three times is a click, not a drag", async () => {
    const { screen, events } = await mountGraph(graph())
    const pointers = pointersOn(screen.container)

    pointers.down(1, node1)
    for (let y = 1; y <= 3; y++) pointers.move(1, at(-100, y))
    pointers.up(1, at(-100, 3))
    expect(types(events)).toEqual(["node:pointerdown", "node:pointerup", "node:click"])
    expect(payloadsOf(events, "node:pointerup")).toEqual([
      { node: "node1", event: expect.any(PointerEvent) },
    ])

    events.splice(0)
    pointers.down(2, node2)
    for (let y = 1; y <= 3; y++) pointers.move(2, at(0, y))
    pointers.cancel(2)
    expect(types(events)).toEqual(["node:pointerdown", "node:pointerup"])
  })

  test("a drag starts on the fourth move, from where the node was", async () => {
    const { screen, events } = await mountGraph(graph())
    const pointers = pointersOn(screen.container)

    pointers.down(1, node1)
    for (let y = 10; y <= 40; y += 10) pointers.move(1, at(-100, y))
    pointers.up(1, at(-100, 40))
    expect(payloadsOf(events, "node:dragstart")).toEqual([{ node1: { x: -100, y: 0 } }])
    expect(payloadsOf(events, "node:pointermove")).toEqual([{ node1: { x: -100, y: 40 } }])
    expect(payloadsOf(events, "node:pointerup")).toEqual([
      { node: "node1", event: expect.any(PointerEvent) },
    ])
  })

  test("a node made undraggable during its drag ends where the last move put it", async () => {
    const { screen, state, events } = await mountGraph(
      graph({ node: { selectable: true, draggable: node => !node.locked } })
    )
    const pointers = pointersOn(screen.container)

    pointers.down(1, node1)
    moveTo(pointers, 1, node1, at(-100, 50))
    state.nodes.node1.locked = true
    await nextTick()
    moveTo(pointers, 1, at(-100, 50), at(-100, 100))
    pointers.up(1, at(-100, 100))

    expect(payloadsOf(events, "node:dragend")).toEqual([{ node1: { x: -100, y: 50 } }])
    expect(state.layouts.nodes.node1).toEqual({ x: -100, y: 50 })
  })

  test("a node removed during its drag is released without errors", async () => {
    const errors = catchErrors()
    const { screen, state, events } = await mountGraph(graph())
    const pointers = pointersOn(screen.container)

    pointers.down(1, node1)
    moveTo(pointers, 1, node1, at(-100, 50))
    delete state.nodes.node1
    await nextTick()
    moveTo(pointers, 1, at(-100, 50), at(-100, 100))
    pointers.up(1, at(-100, 100))

    expect(errors).toEqual([])
    // The drag still ends, for the nodes left.
    expect(payloadsOf(events, "node:dragend")).toEqual([{}])
    expect(payloadsOf(events, "node:pointerup")).toMatchObject([{ node: "node1" }])
    expect(state.layouts.nodes.node1).toBeUndefined()
  })

  test("a node removed while hovered and added again is hovered by the next pointer on it", async () => {
    const errors = catchErrors()
    const hover = { normal: { color: "#0000ff" }, hover: { color: "#ff0000" } }
    const { screen, canvas, state, events } = await mountGraph(graph({ node: hover }))
    const pointers = pointersOn(screen.container)

    await userEvent.hover(canvas, { position: node1 })
    delete state.nodes.node1
    await nextTick()
    pointers.down(1, node2)
    pointers.up(1, node2)
    await nextTick()
    expect(errors).toEqual([])
    expect(payloadsOf(events, "node:click")).toMatchObject([{ node: "node2" }])

    state.nodes.node1 = { name: "Node 1" }
    state.layouts.nodes.node1 = { x: -100, y: 0 }
    await nextTick()
    // Sends only the enter event, since moving away first would also drop a node held as hovered.
    const g = elementAt(screen.container, node1)!.closest(".v-ng-node")!
    expect(g.classList.contains("hover")).toBe(false)
    g.dispatchEvent(new PointerEvent("pointerenter"))
    await nextTick()
    expect(g.classList.contains("hover")).toBe(true)
  })

  test("the selected nodes follow the drag after a cancelled one", async () => {
    const props = graph({ node: selectable })
    props.selectedNodes = ["node1", "node3"]
    const { screen, state } = await mountGraph(props)
    const pointers = pointersOn(screen.container)

    pointers.down(1, node1)
    pointers.cancel(1)
    pointers.down(2, node1)
    moveTo(pointers, 2, node1, at(-100, 50))
    pointers.up(2, at(-100, 50))

    expect(state.layouts.nodes.node3).toEqual({ x: 100, y: 50 })
  })

  test("the selected nodes do not follow a drag of a node that is not selected", async () => {
    const props = graph({ node: selectable })
    props.selectedNodes = ["node1", "node3"]
    const { screen, state } = await mountGraph(props)
    const pointers = pointersOn(screen.container)

    pointers.down(1, node2)
    moveTo(pointers, 1, node2, at(0, 50))
    pointers.up(1, at(0, 50))
    expect(state.layouts.nodes.node3).toEqual({ x: 100, y: 0 })
    await nextTick()

    // Nor while another pointer holds a selected node.
    pointers.down(2, node1)
    pointers.down(3, at(0, 50))
    moveTo(pointers, 3, at(0, 50), at(0, 100))
    pointers.up(3, at(0, 100))
    pointers.up(2, node1)
    expect(state.layouts.nodes).toEqual({
      node1: { x: -100, y: 0 },
      node2: { x: 0, y: 100 },
      node3: { x: 100, y: 0 },
    })
  })

  test("a selected node that is not draggable does not follow", async () => {
    const props = graph({ node: { selectable: true, draggable: node => node.name !== "Node 3" } })
    props.selectedNodes = ["node1", "node2", "node3"]
    const { screen, state } = await mountGraph(props)
    const pointers = pointersOn(screen.container)

    pointers.down(1, node1)
    moveTo(pointers, 1, node1, at(-100, 50))
    pointers.up(1, at(-100, 50))

    expect(state.layouts.nodes).toEqual({
      node1: { x: -100, y: 50 },
      node2: { x: 0, y: 50 },
      node3: { x: 100, y: 0 },
    })
  })

  test("the selected nodes follow a pointer with the id 0", async () => {
    const props = graph({ node: selectable })
    props.selectedNodes = ["node1", "node2", "node3"]
    const { screen, state } = await mountGraph(props)
    const pointers = pointersOn(screen.container)

    pointers.down(0, node1)
    pointers.down(1, node3)
    moveTo(pointers, 0, node1, at(-100, 50))
    pointers.up(0, at(-100, 50))
    pointers.up(1, node3)

    expect(state.layouts.nodes).toEqual({
      node1: { x: -100, y: 50 },
      node2: { x: 0, y: 50 },
      node3: { x: 100, y: 0 },
    })
  })

  test("when the followed node is released, the selected nodes follow another one held", async () => {
    const props = graph({ node: selectable })
    props.selectedNodes = ["node1", "node2", "node3"]
    const { screen, state } = await mountGraph(props)
    const pointers = pointersOn(screen.container)

    pointers.down(1, node1)
    pointers.down(2, node3)
    moveTo(pointers, 1, node1, at(-100, 50))
    pointers.up(1, at(-100, 50))
    moveTo(pointers, 2, node3, at(100, 50))
    pointers.up(2, at(100, 50))

    expect(state.layouts.nodes).toEqual({
      node1: { x: -100, y: 100 },
      node2: { x: 0, y: 100 },
      node3: { x: 100, y: 50 },
    })
  })

  test("the hover is held during a drag, and set to where the pointer is when it ends", async () => {
    const { screen, events } = await mountGraph(graph())
    const pointers = pointersOn(screen.container)
    const nodeAt = (position: { x: number; y: number }) =>
      elementAt(screen.container, position)!.closest(".v-ng-node")!
    const [g1, g2, g3] = [node1, node2, node3].map(nodeAt)
    const hovered = () => [g1, g2, g3].map(g => g.classList.contains("hover"))

    g1.dispatchEvent(new PointerEvent("pointerenter"))
    pointers.down(1, node1)
    await nextTick()
    events.splice(0)
    g1.dispatchEvent(new PointerEvent("pointerleave"))
    g2.dispatchEvent(new PointerEvent("pointerenter"))
    g3.dispatchEvent(new PointerEvent("pointerenter"))
    g3.dispatchEvent(new PointerEvent("pointerleave"))
    await nextTick()
    expect(events).toEqual([])
    expect(hovered()).toEqual([true, false, false])

    pointers.up(1, node1)
    await nextTick()
    expect(hovered()).toEqual([false, true, false])
  })

  test("two taps on a node by different pointers make a double click", async () => {
    const { screen, events } = await mountGraph(graph())
    const pointers = pointersOn(screen.container)

    pointers.down(1, node1)
    pointers.up(1, node1)
    pointers.down(2, node1)
    pointers.up(2, node1)

    expect(payloadsOf(events, "node:dblclick")).toMatchObject([{ node: "node1" }])
  })

  test("a tap on a selected node while a finger holds one not selected keeps it selected", async () => {
    const props = graph({ node: selectable })
    props.selectedNodes = ["node1"]
    const { screen, state } = await mountGraph(props)
    const pointers = pointersOn(screen.container)

    pointers.down(1, node2)
    pointers.down(2, node1)
    pointers.up(2, node1)
    await nextTick()
    expect(state.selectedNodes).toEqual(["node1"])
    pointers.cancel(1)
  })

  test("a click on another node right after a click makes no double click", async () => {
    const { screen, events } = await mountGraph(graph())
    const pointers = pointersOn(screen.container)

    pointers.down(1, node1)
    pointers.up(1, node1)
    pointers.down(1, node3)
    pointers.up(1, node3)
    expect(payloadsOf(events, "node:dblclick")).toEqual([])

    pointers.down(1, node3)
    pointers.up(1, node3)
    expect(payloadsOf(events, "node:dblclick")).toMatchObject([{ node: "node3" }])
  })

  test("clicks make a double click within 500 ms while another pointer is pressed", async () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(0)
    const { screen, events } = await mountGraph(graph())
    const pointers = pointersOn(screen.container)
    // Holding it keeps the past clicks from being cleared.
    pointers.down(9, node2)

    pointers.down(1, node1)
    pointers.up(1, node1)
    now.mockReturnValue(501)
    pointers.down(1, node1)
    pointers.up(1, node1)
    expect(payloadsOf(events, "node:dblclick")).toEqual([])

    now.mockReturnValue(1001)
    pointers.down(1, node1)
    pointers.up(1, node1)
    expect(payloadsOf(events, "node:dblclick")).toMatchObject([{ node: "node1" }])
  })

  test("clicks too far apart in time make no double click", async () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(0)
    const { screen, events } = await mountGraph(graph())
    const pointers = pointersOn(screen.container)

    pointers.down(1, node1)
    pointers.up(1, node1)
    now.mockReturnValue(1000)
    pointers.down(2, node3)
    pointers.up(2, node3)
    pointers.down(1, node1)
    pointers.up(1, node1)

    expect(payloadsOf(events, "node:click")).toHaveLength(3)
    expect(payloadsOf(events, "node:dblclick")).toEqual([])
  })

  test("a double click with the shift key on a node keeps the edges selected and emits no clicks", async () => {
    const props = graph({ node: selectable, edge: selectable })
    props.selectedEdges = ["edge1"]
    const { canvas, state, events } = await mountGraph(props)

    await userEvent.dblClick(canvas, { position: node3, modifiers: ["Shift"] })
    expect(state.selectedEdges).toEqual(["edge1"])
    expect(state.selectedNodes).toEqual([])
    expect(payloadsOf(events, "node:click")).toEqual([])
    expect(payloadsOf(events, "node:dblclick")).toEqual([])
  })

  test("a node removed while pressed is not selected when released", async () => {
    const { screen, state } = await mountGraph(graph({ node: selectable }))
    const pointers = pointersOn(screen.container)

    pointers.down(1, node1)
    delete state.nodes.node1
    await nextTick()
    pointers.up(1, node1)
    await nextTick()

    expect(state.selectedNodes).toEqual([])
  })

  test("an edge can be pressed after a node is released", async () => {
    const { screen, events } = await mountGraph(graph())
    const pointers = pointersOn(screen.container)

    pointers.down(1, node1)
    pointers.up(1, node1)
    pointers.down(2, edge1)
    expect(payloadsOf(events, "edge:pointerdown")).toHaveLength(1)
  })

  test("a click with the shift key selects an edge once the nodes are deselected", async () => {
    const { canvas, state } = await mountGraph(graph({ node: selectable, edge: selectable }))

    await userEvent.click(canvas, { position: node1 })
    state.selectedNodes = []
    await nextTick()
    await userEvent.click(canvas, { position: edge1, modifiers: ["Shift"] })
    expect(state.selectedEdges).toEqual(["edge1"])
  })

  test("a node is not pressed while a pointer is on an edge", async () => {
    const { screen, events } = await mountGraph(graph())
    const pointers = pointersOn(screen.container)

    pointers.down(1, edge1)
    pointers.down(2, node3)
    expect(types(events)).toEqual(["edge:pointerdown"])
  })
})

describe("edges", () => {
  test("an edge is not pressed while a pointer is on a node", async () => {
    const { screen, events } = await mountGraph(graph())
    const pointers = pointersOn(screen.container)

    pointers.down(1, node1)
    pointers.down(2, edge2)
    expect(types(events)).toEqual(["node:pointerdown"])
  })

  test("pointers on two edges are released each with a click", async () => {
    const { screen, state, events } = await mountGraph(graph({ edge: selectable }))
    const pointers = pointersOn(screen.container)

    pointers.down(1, edge1)
    pointers.down(2, edge2)
    pointers.up(9, node2)
    pointers.cancel(9)
    pointers.up(1, edge1)
    await nextTick()
    expect(state.selectedEdges).toEqual(["edge1"])

    pointers.up(2, edge2)
    await nextTick()
    expect(state.selectedEdges).toEqual(["edge2"])
    expect(types(events).filter(t => t.startsWith("edge:"))).toEqual([
      "edge:pointerdown",
      "edge:pointerdown",
      "edge:pointerup",
      "edge:click",
      "edge:select",
      "edge:pointerup",
      "edge:click",
      "edge:select",
    ])
  })

  test("a tap with a finger on a selected edge adds the tapped edge to the selection", async () => {
    const props = graph({ edge: selectable })
    props.selectedEdges = ["edge1"]
    const { screen, state } = await mountGraph(props)
    const pointers = pointersOn(screen.container)

    pointers.down(1, edge1)
    pointers.down(2, edge2)
    pointers.up(2, edge2)
    pointers.up(1, edge1)
    await nextTick()

    expect(state.selectedEdges).toEqual(["edge1", "edge2"])
  })

  test("a double click with the shift key on an edge keeps the nodes selected and emits no clicks", async () => {
    const props = graph({ node: selectable, edge: selectable })
    props.selectedNodes = ["node1"]
    const { canvas, state, events } = await mountGraph(props)

    await userEvent.dblClick(canvas, { position: edge2, modifiers: ["Shift"] })
    expect(state.selectedNodes).toEqual(["node1"])
    expect(payloadsOf(events, "edge:click")).toEqual([])
    expect(payloadsOf(events, "edge:dblclick")).toEqual([])
  })

  test("a click with the shift key ignored on an edge is not the first of a double click", async () => {
    const props = graph({ node: selectable, edge: selectable })
    props.selectedNodes = ["node1"]
    const { canvas, events } = await mountGraph(props)

    await userEvent.click(canvas, { position: edge2, modifiers: ["Shift"] })
    await userEvent.click(canvas, { position: edge2 })
    expect(payloadsOf(events, "edge:click")).toHaveLength(1)
    expect(payloadsOf(events, "edge:dblclick")).toEqual([])
  })

  test("a click with the shift key on an edge selects it once a click on a node selected nothing", async () => {
    const props = graph({
      node: { selectable: (node: Node) => node.name !== "Node 3" },
      edge: selectable,
    })
    const { canvas, state, events } = await mountGraph(props)

    await userEvent.click(canvas, { position: node3 })
    await userEvent.click(canvas, { position: edge2, modifiers: ["Shift"] })
    expect(state.selectedEdges).toEqual(["edge2"])
    expect(payloadsOf(events, "edge:click")).toHaveLength(1)
  })

  test("a click with the shift key on an edge keeps the nodes selected beyond node.selectable 1", async () => {
    const props = graph({ node: { selectable: 1 }, edge: selectable })
    props.selectedNodes = ["node1", "node2"]
    const { canvas, state, events } = await mountGraph(props)

    await userEvent.click(canvas, { position: edge2, modifiers: ["Shift"] })
    expect(state.selectedNodes).toEqual(["node1", "node2"])
    expect(payloadsOf(events, "edge:click")).toEqual([])
  })

  test("a click with the shift key on an edge selects it with node.selectable 1", async () => {
    const props = graph({ node: { selectable: 1 }, edge: selectable })
    props.selectedNodes = ["node1"]
    const { canvas, state, events } = await mountGraph(props)

    await userEvent.click(canvas, { position: edge2, modifiers: ["Shift"] })
    expect(state.selectedNodes).toEqual([])
    expect(state.selectedEdges).toEqual(["edge2"])
    expect(payloadsOf(events, "edge:click")).toHaveLength(1)
  })

  test("a number for selectable limits the edges added with the shift key", async () => {
    const { canvas, state } = await mountGraph(graph({ edge: { selectable: 1 } }))

    await userEvent.click(canvas, { position: edge1 })
    await userEvent.click(canvas, { position: edge2, modifiers: ["Shift"] })
    expect(state.selectedEdges).toEqual(["edge1"])

    await userEvent.click(canvas, { position: edge1 })
    expect(state.selectedEdges).toEqual(["edge1"])
  })

  test("a click with the shift key selects a node once the edges are deselected", async () => {
    const { canvas, state } = await mountGraph(graph({ node: selectable, edge: selectable }))

    await userEvent.click(canvas, { position: edge1 })
    state.selectedEdges = []
    await nextTick()
    await userEvent.click(canvas, { position: node1, modifiers: ["Shift"] })
    expect(state.selectedNodes).toEqual(["node1"])
  })

  test("an edge pressed after a cancelled press is clicked", async () => {
    const { screen, events } = await mountGraph(graph())
    const pointers = pointersOn(screen.container)

    pointers.down(1, edge1)
    pointers.cancel(1)
    pointers.down(2, edge2)
    pointers.up(2, edge2)
    expect(payloadsOf(events, "edge:click")).toMatchObject([{ edge: "edge2" }])
  })

  test("a tap on a selected edge while a finger holds one not selected keeps it selected", async () => {
    const props = graph({ edge: selectable })
    props.selectedEdges = ["edge1"]
    const { screen, state } = await mountGraph(props)
    const pointers = pointersOn(screen.container)

    pointers.down(1, edge2)
    pointers.down(2, edge1)
    pointers.up(2, edge1)
    await nextTick()
    expect(state.selectedEdges).toEqual(["edge1"])
    pointers.cancel(1)
  })

  test("an edge removed while pressed is released without errors", async () => {
    const errors = catchErrors()
    const { screen, state, events } = await mountGraph(graph({ edge: selectable }))
    const pointers = pointersOn(screen.container)

    pointers.down(1, edge2)
    delete state.edges!.edge2
    await nextTick()
    pointers.up(1, edge2)
    await nextTick()

    expect(errors).toEqual([])
    expect(payloadsOf(events, "edge:click")).toMatchObject([{ edge: "edge2" }])
    expect(state.selectedEdges).toEqual([])
  })

  test("a number for selectable lets the edges be added with the shift key up to it", async () => {
    const { canvas, state } = await mountGraph(graph({ edge: { selectable: 2 } }))

    await userEvent.click(canvas, { position: edge1 })
    await userEvent.click(canvas, { position: edge2, modifiers: ["Shift"] })
    expect(state.selectedEdges).toEqual(["edge1", "edge2"])
  })

  describe("summarized", () => {
    const summarized = (configs: UserConfigs) => {
      const props = graph({ ...configs, edge: { ...configs.edge, summarize: () => true } })
      props.edges!.edge3 = { source: "node1", target: "node2" }
      return props
    }

    test("a click selects nothing when none of the edges is selectable", async () => {
      const { canvas, state, events } = await mountGraph(summarized({}))

      await userEvent.click(canvas, { position: edge1 })
      expect(state.selectedEdges).toEqual([])
      expect(payloadsOf(events, "edge:click")).toMatchObject([{ edges: ["edge1", "edge3"] }])
    })

    test("a click with the shift key adds or removes all of the edges", async () => {
      const { canvas, state } = await mountGraph(summarized({ edge: selectable }))

      await userEvent.click(canvas, { position: edge2 })
      await userEvent.click(canvas, { position: edge1, modifiers: ["Shift"] })
      expect(state.selectedEdges).toEqual(["edge2", "edge1", "edge3"])

      await userEvent.click(canvas, { position: edge1, modifiers: ["Shift"] })
      expect(state.selectedEdges).toEqual(["edge2"])
    })

    test("a click with the shift key adds all of the edges when they fit within the limit", async () => {
      const { canvas, state } = await mountGraph(summarized({ edge: { selectable: 3 } }))

      await userEvent.click(canvas, { position: edge2 })
      await userEvent.click(canvas, { position: edge1, modifiers: ["Shift"] })
      expect(state.selectedEdges).toEqual(["edge2", "edge1", "edge3"])
    })

    test("a click with the shift key adds none of the edges when not all fit within the limit", async () => {
      const { canvas, state } = await mountGraph(summarized({ edge: { selectable: 2 } }))

      await userEvent.click(canvas, { position: edge2 })
      await userEvent.click(canvas, { position: edge1, modifiers: ["Shift"] })
      expect(state.selectedEdges).toEqual(["edge2"])
    })

    test("a click with the shift key adds none of the edges when the limit is reached", async () => {
      const props = summarized({ edge: { selectable: 2 } })
      props.edges!.edge4 = { source: "node2", target: "node3" }
      props.selectedEdges = ["edge2", "edge4"]
      const { canvas, state } = await mountGraph(props)

      await userEvent.click(canvas, { position: edge1, modifiers: ["Shift"] })
      expect(state.selectedEdges).toEqual(["edge2", "edge4"])
    })

    test("a click selects none of the edges when they outnumber the limit", async () => {
      const props = summarized({ edge: { selectable: 1 } })
      props.selectedEdges = ["edge2"]
      const { canvas, state, events } = await mountGraph(props)

      await userEvent.click(canvas, { position: edge1 })
      expect(state.selectedEdges).toEqual(["edge2"])
      expect(payloadsOf(events, "edge:click")).toMatchObject([{ edges: ["edge1", "edge3"] }])
    })

    test("a click with the shift key removes the selected edges even when they outnumber the limit", async () => {
      const props = summarized({ edge: { selectable: 1 } })
      props.selectedEdges = ["edge1"]
      const { canvas, state } = await mountGraph(props)

      await userEvent.click(canvas, { position: edge1, modifiers: ["Shift"] })
      expect(state.selectedEdges).toEqual([])
    })

    describe("only some of which are selectable", () => {
      const someSelectable = (selectedEdges: string[] = []) => {
        const props = summarized({ edge: { selectable: (edge: Edge) => !edge.locked } })
        props.edges!.edge3.locked = true
        props.selectedEdges = selectedEdges
        return props
      }

      test("a click selects only the selectable edges", async () => {
        const { canvas, state } = await mountGraph(someSelectable())

        await userEvent.click(canvas, { position: edge1 })
        expect(state.selectedEdges).toEqual(["edge1"])
      })

      test("a click with the shift key adds only the selectable edges", async () => {
        const { canvas, state } = await mountGraph(someSelectable(["edge2"]))

        await userEvent.click(canvas, { position: edge1, modifiers: ["Shift"] })
        expect(state.selectedEdges).toEqual(["edge2", "edge1"])
      })

      test("a click on the edges whose selectable ones are all selected keeps the selection", async () => {
        const { canvas, state } = await mountGraph(someSelectable(["edge2", "edge1"]))

        await userEvent.click(canvas, { position: edge1 })
        expect(state.selectedEdges).toEqual(["edge2", "edge1"])
      })

      test("a click with the shift key removes all of the edges, selectable or not", async () => {
        const { canvas, state } = await mountGraph(someSelectable(["edge1", "edge3"]))

        await userEvent.click(canvas, { position: edge1, modifiers: ["Shift"] })
        expect(state.selectedEdges).toEqual([])
      })

      test("a click with the shift key removes the edges when only an unselectable one is selected", async () => {
        const { canvas, state } = await mountGraph(someSelectable(["edge3"]))

        await userEvent.click(canvas, { position: edge1, modifiers: ["Shift"] })
        expect(state.selectedEdges).toEqual([])
      })

      test("a tap while a finger holds a selected unselectable edge adds the tapped edges", async () => {
        const props = someSelectable(["edge2"])
        props.edges!.edge2.locked = true
        const { screen, state } = await mountGraph(props)
        const pointers = pointersOn(screen.container)

        pointers.down(1, edge2)
        pointers.down(2, edge1)
        pointers.up(2, edge1)
        await nextTick()
        expect(state.selectedEdges).toEqual(["edge2", "edge1"])
        pointers.cancel(1)
      })

      test("a tap with a finger on the selected edges adds the tapped edge", async () => {
        const { screen, state } = await mountGraph(someSelectable(["edge1"]))
        const pointers = pointersOn(screen.container)

        pointers.down(1, edge1)
        pointers.down(2, edge2)
        pointers.up(2, edge2)
        await nextTick()
        expect(state.selectedEdges).toEqual(["edge1", "edge2"])
        pointers.cancel(1)
      })
    })

    test("a tap with a finger on the selected edges adds the tapped edge to the selection", async () => {
      const props = summarized({ edge: selectable })
      props.selectedEdges = ["edge1", "edge3"]
      const { screen, state } = await mountGraph(props)
      const pointers = pointersOn(screen.container)

      pointers.down(1, edge1)
      pointers.down(2, edge2)
      pointers.up(2, edge2)
      await nextTick()
      expect(state.selectedEdges).toEqual(["edge1", "edge3", "edge2"])
      pointers.cancel(1)
    })

    test.each([false, true])(
      "a click on edges one of which is removed while pressed selects the rest, shift key: %s",
      async shiftKey => {
        const errors = catchErrors()
        const { screen, state, events } = await mountGraph(summarized({ edge: selectable }))
        const pointers = pointersOn(screen.container)

        pointers.down(1, edge1)
        delete state.edges!.edge1
        await nextTick()
        pointers.up(1, edge1, { shiftKey })
        await nextTick()

        expect(errors).toEqual([])
        expect(state.selectedEdges).toEqual(["edge3"])
        expect(payloadsOf(events, "edge:click")).toMatchObject([{ edges: ["edge1", "edge3"] }])
      }
    )

    test("a tap while a finger holds edges only some of which are selected selects only the tapped one", async () => {
      const props = summarized({ edge: selectable })
      props.selectedEdges = ["edge1"]
      const { screen, state } = await mountGraph(props)
      const pointers = pointersOn(screen.container)

      pointers.down(1, edge1)
      pointers.down(2, edge2)
      pointers.up(2, edge2)
      await nextTick()
      expect(state.selectedEdges).toEqual(["edge2"])
      pointers.cancel(1)
    })

    test("a click selects only the edges clicked", async () => {
      const props = summarized({ edge: selectable })
      props.selectedEdges = ["edge2"]
      const { canvas, state } = await mountGraph(props)

      await userEvent.click(canvas, { position: edge1 })
      expect(state.selectedEdges).toEqual(["edge1", "edge3"])
    })

    test("a click on the edges all selected keeps the rest of the selection", async () => {
      const props = summarized({ edge: selectable })
      props.selectedEdges = ["edge2", "edge1", "edge3"]
      const { canvas, state, events } = await mountGraph(props)

      await userEvent.click(canvas, { position: edge1 })
      expect(state.selectedEdges).toEqual(["edge2", "edge1", "edge3"])
      expect(payloadsOf(events, "edge:click")).toMatchObject([{ edges: ["edge1", "edge3"] }])
    })

    test("a click on the edges some of which are selected selects only them", async () => {
      const props = summarized({ edge: selectable })
      props.selectedEdges = ["edge2", "edge1"]
      const { canvas, state } = await mountGraph(props)

      await userEvent.click(canvas, { position: edge1 })
      expect(state.selectedEdges).toEqual(["edge1", "edge3"])
    })

    test("releasing a finger from the selected edges keeps the edge tapped meanwhile", async () => {
      const props = summarized({ edge: selectable })
      props.selectedEdges = ["edge1", "edge3"]
      const { screen, state } = await mountGraph(props)
      const pointers = pointersOn(screen.container)

      pointers.down(1, edge1)
      pointers.down(2, edge2)
      pointers.up(2, edge2)
      pointers.up(1, edge1)
      await nextTick()
      expect(state.selectedEdges).toEqual(["edge1", "edge3", "edge2"])
    })

    test("a click with the shift key removes all of the edges when some are selected", async () => {
      const props = summarized({ edge: selectable })
      props.selectedEdges = ["edge1"]
      const { canvas, state } = await mountGraph(props)

      await userEvent.click(canvas, { position: edge1, modifiers: ["Shift"] })
      expect(state.selectedEdges).toEqual([])
    })

    test("clicks on two sets of the edges make no double click", async () => {
      const props = summarized({})
      props.edges!.edge4 = { source: "node2", target: "node3" }
      const { screen, events } = await mountGraph(props)
      const pointers = pointersOn(screen.container)

      pointers.down(1, edge1)
      pointers.up(1, edge1)
      pointers.down(1, edge2)
      pointers.up(1, edge2)
      expect(payloadsOf(events, "edge:click")).toHaveLength(2)
      expect(payloadsOf(events, "edge:dblclick")).toEqual([])
    })

    test("hovering the edges emits them all and applies the hover state", async () => {
      const { screen, events } = await mountGraph(summarized({}))
      const g = screen.container.querySelector(".v-ng-line-summarized")!
      const edges = { edges: ["edge1", "edge3"], summarized: true }

      g.dispatchEvent(new PointerEvent("pointerenter"))
      await nextTick()
      expect(payloadsOf(events, "edge:pointerover")).toMatchObject([edges])
      expect(g.classList.contains("hovered")).toBe(true)

      g.dispatchEvent(new PointerEvent("pointerleave"))
      await nextTick()
      expect(payloadsOf(events, "edge:pointerout")).toMatchObject([edges])
      expect(g.classList.contains("hovered")).toBe(false)
    })

    test("a double click and a right click emit all of the edges", async () => {
      const { canvas, events } = await mountGraph(summarized({}))

      await userEvent.dblClick(canvas, { position: edge1 })
      await userEvent.click(canvas, { position: edge1, button: "right" })
      const edges = { edges: ["edge1", "edge3"], summarized: true }
      expect(payloadsOf(events, "edge:dblclick")).toMatchObject([edges])
      expect(payloadsOf(events, "edge:contextmenu")).toMatchObject([edges])
    })
  })
})

describe("paths", () => {
  const clickable = { visible: true, clickable: true, selectable: true }

  test("a path in the compatibility mode is emitted as the object given", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {})
    const props = graph({ path: clickable })
    const path1 = { edges: ["edge1"] }
    props.paths = [path1] as unknown as Paths
    const { canvas, events } = await mountGraph(props)

    await userEvent.click(canvas, { position: edge1 })
    expect(payloadsOf(events, "path:click")).toEqual([{ path: path1, event: expect.anything() }])
  })

  test("a path in the compatibility mode removed while pressed is emitted by its id", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {})
    const props = graph({ path: clickable })
    props.paths = [{ edges: ["edge1"] }] as unknown as Paths
    const { screen, state, events } = await mountGraph(props)
    const pointers = pointersOn(screen.container)

    pointers.down(1, edge1)
    state.paths = []
    await nextTick()
    pointers.up(1, edge1)

    expect(payloadsOf(events, "path:pointerup")).toMatchObject([{ path: expect.any(String) }])
  })

  test("a path that is only hoverable is neither pressed nor given a context menu", async () => {
    const { canvas, events } = await mountGraph(graph({ path: { visible: true, hoverable: true } }))

    await userEvent.click(canvas, { position: edge1 })
    await userEvent.click(canvas, { position: edge1, button: "right" })
    expect(payloadsOf(events, "path:pointerdown")).toEqual([])
    expect(payloadsOf(events, "path:contextmenu")).toEqual([])
  })

  test("a right click emits contextmenu and no press", async () => {
    const { canvas, events } = await mountGraph(graph({ path: clickable }))

    await userEvent.click(canvas, { position: edge1, button: "right" })
    expect(payloadsOf(events, "path:contextmenu")).toMatchObject([{ path: "path1" }])
    expect(payloadsOf(events, "path:pointerdown")).toEqual([])
    expect(payloadsOf(events, "view:contextmenu")).toEqual([])
  })

  test("a double click emits two clicks and a double click", async () => {
    const { canvas, events } = await mountGraph(graph({ path: { visible: true, clickable: true } }))

    await userEvent.dblClick(canvas, { position: edge1 })
    expect(payloadsOf(events, "path:click")).toHaveLength(2)
    expect(payloadsOf(events, "path:dblclick")).toMatchObject([{ path: "path1" }])
  })

  test("a path is not pressed while a pointer is on a node", async () => {
    // node3 is off the path, which covers the nodes on it.
    const props = graph({ path: clickable })
    props.paths = { path1: { edges: ["edge1"] } }
    const { screen, events } = await mountGraph(props)
    const pointers = pointersOn(screen.container)

    pointers.down(1, node3)
    pointers.down(2, edge1)
    expect(types(events)).toEqual(["node:pointerdown"])
  })

  test("pointers on two paths are released each with a click", async () => {
    const { screen, state, events } = await mountGraph(graph({ path: clickable }))
    const pointers = pointersOn(screen.container)

    pointers.down(1, edge1)
    pointers.down(2, edge2)
    pointers.up(9, node2)
    pointers.cancel(9)
    pointers.up(1, edge1)
    await nextTick()
    expect(state.selectedPaths).toEqual(["path1"])

    pointers.up(2, edge2)
    await nextTick()
    expect(state.selectedPaths).toEqual(["path2"])
    expect(payloadsOf(events, "path:pointerdown")).toMatchObject([
      { path: "path1" },
      { path: "path2" },
    ])
    expect(payloadsOf(events, "path:pointerup")).toHaveLength(2)
  })

  test("a tap with a finger on a selected path adds the tapped path to the selection", async () => {
    const props = graph({ path: clickable })
    props.selectedPaths = ["path1"]
    const { screen, state } = await mountGraph(props)
    const pointers = pointersOn(screen.container)

    pointers.down(1, edge1)
    pointers.down(2, edge2)
    pointers.up(2, edge2)
    pointers.up(1, edge1)
    await nextTick()

    expect(state.selectedPaths).toEqual(["path1", "path2"])
  })

  test("a click with the shift key adds or removes a path, up to the number selectable", async () => {
    // Solid when selected, as a click in a gap of the dashes goes to the edge below.
    const { canvas, state } = await mountGraph(
      graph({ path: { ...clickable, selectable: 1, selected: { dasharray: 0 } } })
    )

    await userEvent.click(canvas, { position: edge1 })
    await userEvent.click(canvas, { position: edge2, modifiers: ["Shift"] })
    expect(state.selectedPaths).toEqual(["path1"])

    await userEvent.click(canvas, { position: edge1, modifiers: ["Shift"] })
    expect(state.selectedPaths).toEqual([])
  })

  test("a number for selectable lets the paths be added with the shift key up to it", async () => {
    const { canvas, state } = await mountGraph(graph({ path: { ...clickable, selectable: 2 } }))

    await userEvent.click(canvas, { position: edge1 })
    await userEvent.click(canvas, { position: edge2, modifiers: ["Shift"] })
    expect(state.selectedPaths).toEqual(["path1", "path2"])
  })

  test("a double click with the shift key on a path keeps the nodes selected and emits no clicks", async () => {
    const props = graph({ node: selectable, path: clickable })
    props.selectedNodes = ["node1"]
    const { canvas, state, events } = await mountGraph(props)

    await userEvent.dblClick(canvas, { position: edge2, modifiers: ["Shift"] })
    expect(state.selectedNodes).toEqual(["node1"])
    expect(payloadsOf(events, "path:click")).toEqual([])
    expect(payloadsOf(events, "path:dblclick")).toEqual([])
  })

  test("a node can be pressed after a path is released", async () => {
    const props = graph({ path: clickable })
    props.paths = { path1: { edges: ["edge1"] } }
    const { screen, events } = await mountGraph(props)
    const pointers = pointersOn(screen.container)

    pointers.down(1, edge1)
    pointers.up(1, edge1)
    pointers.down(2, node3)
    expect(payloadsOf(events, "node:pointerdown")).toMatchObject([{ node: "node3" }])
  })

  test("a path pressed after a cancelled press is clicked", async () => {
    const { screen, events } = await mountGraph(graph({ path: clickable }))
    const pointers = pointersOn(screen.container)

    pointers.down(1, edge1)
    pointers.cancel(1)
    pointers.down(2, edge2)
    pointers.up(2, edge2)
    expect(payloadsOf(events, "path:click")).toMatchObject([{ path: "path2" }])
  })

  test("a tap on a selected path while a finger holds one not selected keeps it selected", async () => {
    const props = graph({ path: clickable })
    props.selectedPaths = ["path1"]
    const { screen, state } = await mountGraph(props)
    const pointers = pointersOn(screen.container)

    pointers.down(1, edge2)
    pointers.down(2, edge1)
    pointers.up(2, edge1)
    await nextTick()
    expect(state.selectedPaths).toEqual(["path1"])
    pointers.cancel(1)
  })

  test("a click with the shift key selects a node once the paths are deselected", async () => {
    const props = graph({ node: selectable, path: clickable })
    props.paths = { path1: { edges: ["edge1"] } }
    const { canvas, state } = await mountGraph(props)

    await userEvent.click(canvas, { position: edge1 })
    state.selectedPaths = []
    await nextTick()
    await userEvent.click(canvas, { position: node3, modifiers: ["Shift"] })
    expect(state.selectedNodes).toEqual(["node3"])
  })

  test("a click with the shift key selects a path once the nodes are deselected", async () => {
    const props = graph({ node: selectable, path: clickable })
    props.paths = { path1: { edges: ["edge1"] } }
    const { canvas, state } = await mountGraph(props)

    await userEvent.click(canvas, { position: node3 })
    state.selectedNodes = []
    await nextTick()
    await userEvent.click(canvas, { position: edge1, modifiers: ["Shift"] })
    expect(state.selectedPaths).toEqual(["path1"])
  })

  test("clicking the background clears the selected paths", async () => {
    const props = graph({ path: clickable })
    props.selectedPaths = ["path1", "path2"]
    const { canvas, state } = await mountGraph(props)

    await userEvent.click(canvas, { position: at(0, 100) })
    expect(state.selectedPaths).toEqual([])
  })

  test("a path removed while pressed is clicked and double clicked, as nodes and edges are", async () => {
    const errors = catchErrors()
    const { screen, state, events } = await mountGraph(graph({ path: clickable }))
    const pointers = pointersOn(screen.container)

    pointers.down(1, edge1)
    pointers.up(1, edge1)
    pointers.down(1, edge1)
    delete (state.paths as Paths).path1
    await nextTick()
    pointers.up(1, edge1)

    expect(errors).toEqual([])
    expect(payloadsOf(events, "path:click")).toMatchObject([{ path: "path1" }, { path: "path1" }])
    expect(payloadsOf(events, "path:dblclick")).toMatchObject([{ path: "path1" }])
  })

  test("a path removed while pressed is clicked without being selected", async () => {
    const errors = catchErrors()
    const { screen, state, events } = await mountGraph(graph({ path: clickable }))
    const pointers = pointersOn(screen.container)

    pointers.down(1, edge1)
    delete (state.paths as Paths).path1
    await nextTick()
    pointers.up(1, edge1)

    expect(errors).toEqual([])
    expect(payloadsOf(events, "path:click")).toMatchObject([{ path: "path1" }])
    expect(state.selectedPaths).toEqual([])
  })

  test("a path that is clickable but not hoverable emits no hover events", async () => {
    const { canvas, events } = await mountGraph(graph({ path: clickable }))

    await userEvent.hover(canvas, { position: edge1 })
    await userEvent.hover(canvas, { position: at(0, 100) })
    expect(payloadsOf(events, "path:pointerover")).toEqual([])
    expect(payloadsOf(events, "path:pointerout")).toEqual([])
  })

  test("a path made unclickable while pressed is not clicked", async () => {
    const { screen, state, events } = await mountGraph(graph({ path: clickable }))
    const pointers = pointersOn(screen.container)

    pointers.down(1, edge1)
    pointers.up(1, edge1)
    pointers.down(1, edge1)
    state.configs.path!.clickable = false
    await nextTick()
    pointers.up(1, edge1)

    expect(payloadsOf(events, "path:pointerup")).toHaveLength(2)
    expect(payloadsOf(events, "path:click")).toHaveLength(1)
    expect(payloadsOf(events, "path:dblclick")).toEqual([])
  })
})
