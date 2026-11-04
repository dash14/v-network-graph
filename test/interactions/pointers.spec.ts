import { afterEach, describe, expect, test, vi } from "vitest"
import { userEvent } from "vitest/browser"
import { nextTick } from "vue"
import type { Paths, UserConfigs } from "@/index"
import type { GraphProps } from "../helpers/graph"
import { at, mountGraph, payloadsOf, pointersOn } from "../helpers/graph"

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

  test("two taps on a node by different pointers make a double click", async () => {
    const { screen, events } = await mountGraph(graph())
    const pointers = pointersOn(screen.container)

    pointers.down(1, node1)
    pointers.up(1, node1)
    pointers.down(2, node1)
    pointers.up(2, node1)

    expect(payloadsOf(events, "node:dblclick")).toMatchObject([{ node: "node1" }])
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

  test("a click with the shift key on a node keeps the edges selected", async () => {
    const props = graph({ node: selectable, edge: selectable })
    props.selectedEdges = ["edge1"]
    const { canvas, state, events } = await mountGraph(props)

    await userEvent.click(canvas, { position: node3, modifiers: ["Shift"] })
    expect(state.selectedEdges).toEqual(["edge1"])
    expect(state.selectedNodes).toEqual([])
    expect(payloadsOf(events, "node:click")).toEqual([])
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

  test("a click with the shift key on an edge keeps the nodes selected", async () => {
    const props = graph({ node: selectable, edge: selectable })
    props.selectedNodes = ["node1"]
    const { canvas, state, events } = await mountGraph(props)

    await userEvent.click(canvas, { position: edge2, modifiers: ["Shift"] })
    expect(state.selectedNodes).toEqual(["node1"])
    expect(payloadsOf(events, "edge:click")).toEqual([])
  })

  test("a number for selectable limits the edges added with the shift key", async () => {
    const { canvas, state } = await mountGraph(graph({ edge: { selectable: 1 } }))

    await userEvent.click(canvas, { position: edge1 })
    await userEvent.click(canvas, { position: edge2, modifiers: ["Shift"] })
    expect(state.selectedEdges).toEqual(["edge1"])

    await userEvent.click(canvas, { position: edge1 })
    expect(state.selectedEdges).toEqual(["edge1"])
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

    test("a number for selectable limits the edges added with the shift key", async () => {
      const { canvas, state } = await mountGraph(summarized({ edge: { selectable: 2 } }))

      await userEvent.click(canvas, { position: edge2 })
      await userEvent.click(canvas, { position: edge1, modifiers: ["Shift"] })
      expect(state.selectedEdges).toEqual(["edge2", "edge1"])
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

  test("a click with the shift key on a path keeps the nodes selected", async () => {
    const props = graph({ node: selectable, path: clickable })
    props.selectedNodes = ["node1"]
    const { canvas, state, events } = await mountGraph(props)

    await userEvent.click(canvas, { position: edge2, modifiers: ["Shift"] })
    expect(state.selectedNodes).toEqual(["node1"])
    expect(payloadsOf(events, "path:click")).toEqual([])
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
