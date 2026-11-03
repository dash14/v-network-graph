import { describe, expect, test } from "vitest"
import { userEvent } from "vitest/browser"
import { at, mountGraph, payloadsOf } from "../helpers/graph"

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
