import { describe, expect, it, vi } from "vitest"
import { nextTick, ref, watch } from "vue"
import { Reactive } from "@/common/common"
import type { Layouts, Nodes } from "@/common/types"
import { trackNodePositions } from "./positionTracker"

function setup() {
  const layouts = Reactive<Layouts>({
    nodes: { node1: { x: 0, y: 0 }, node2: { x: 10, y: 0 } },
  })
  const nodes = ref<Nodes>({ node1: {}, node2: {} })
  const onMove = vi.fn<(moved: Set<string>) => void>()
  const changed = vi.fn()
  watch(trackNodePositions(layouts, nodes, onMove), changed, { flush: "sync" })
  const movedIds = () => onMove.mock.calls.map(([ids]) => Array.from(ids))
  return { layouts, nodes, onMove, changed, movedIds }
}

describe("trackNodePositions", () => {
  it("should tell every node moved on the first run, without telling a change", () => {
    const { changed, movedIds } = setup()
    expect(movedIds()).toEqual([["node1", "node2"]])
    expect(changed).not.toHaveBeenCalled()
  })

  it("should tell a node moved on either axis, with a change", async () => {
    const { layouts, onMove, changed, movedIds } = setup()
    onMove.mockClear()
    layouts.nodes.node2.y = 5
    await nextTick()
    expect(movedIds()).toEqual([["node2"]])
    expect(changed).toHaveBeenCalledOnce()
  })

  it.each([
    ["fixed", (layouts: Layouts) => (layouts.nodes.node1.fixed = true)],
    ["given as another value drawn the same", (layouts: Layouts) => (layouts.nodes.node1.x = NaN)],
  ])("should tell a change, but no move, of a position %s", async (_, change) => {
    const { layouts, onMove, changed } = setup()
    onMove.mockClear()
    change(layouts)
    await nextTick()
    expect(onMove).not.toHaveBeenCalled()
    expect(changed).toHaveBeenCalledOnce()
  })

  it("should tell nothing of a position replaced by an equal one", async () => {
    const { layouts, onMove, changed } = setup()
    onMove.mockClear()
    layouts.nodes.node1 = { x: 0, y: 0 }
    await nextTick()
    expect(onMove).not.toHaveBeenCalled()
    expect(changed).not.toHaveBeenCalled()
  })

  it("should tell a node that lost its position as moved, and not the others", async () => {
    const { layouts, onMove, changed, movedIds } = setup()
    onMove.mockClear()
    delete layouts.nodes.node1
    await nextTick()
    expect(movedIds()).toEqual([["node1"]])
    expect(changed).toHaveBeenCalledOnce()

    // Forgotten once told, so that it is not told again on the next run.
    layouts.nodes.node2 = { x: 10, y: 0 }
    await nextTick()
    expect(movedIds()).toEqual([["node1"]])
    expect(changed).toHaveBeenCalledOnce()
  })

  it("should not tell a removed node as moved", async () => {
    const { layouts, nodes, onMove, changed } = setup()
    onMove.mockClear()
    nodes.value = { node2: {} }
    delete layouts.nodes.node1
    await nextTick()
    expect(onMove).not.toHaveBeenCalled()
    expect(changed).toHaveBeenCalledOnce()
  })
})
