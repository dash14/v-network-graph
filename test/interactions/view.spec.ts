import { describe, expect, onTestFinished, test } from "vitest"
import { userEvent } from "vitest/browser"
import { at, elementAt, mountGraph, payloadsOf } from "../helpers/graph"

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
