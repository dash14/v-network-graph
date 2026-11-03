import mitt from "mitt"
import { describe, expect, it } from "vitest"
import { nextTick, ref } from "vue"
import { Reactive } from "@/common/common"
import { getFullConfigs } from "@/common/config-defaults"
import { Events, NodePositions, Nodes } from "@/common/types"
import { SvgPanZoomInstance } from "@/modules/svg-pan-zoom-ex"
import { SimpleLayout } from "./simple"

// Nodes of 60 by 40 at the scale of 2, placed 40 apart, in a view centered at the origin.
function setup(nodeIds: string[], right: number, positions: NodePositions = {}) {
  const layout = new SimpleLayout()
  const nodes = ref<Nodes>(Object.fromEntries(nodeIds.map(id => [id, {}])))
  const nodePositions = ref<NodePositions>(positions)
  const emitter = mitt<Events>()
  const configs = getFullConfigs({
    node: { normal: { type: "rect", width: 30, height: 20 } },
  })
  const area = { box: { top: -200, left: -right, right, bottom: 200 }, center: { x: 0, y: 0 } }
  layout.activate({
    layouts: Reactive(nodePositions.value),
    nodePositions,
    nodes,
    edges: ref({}),
    configs,
    scale: ref(2),
    emitter,
    svgPanZoom: { getViewArea: () => area } as SvgPanZoomInstance,
  })
  return { layout, nodes, nodePositions, emitter }
}

describe("SimpleLayout", () => {
  it("places the new nodes beside each other, up to the edge of the view", () => {
    const { nodePositions } = setup(["node1", "node2"], 130)
    expect(nodePositions.value).toEqual({ node1: { x: 0, y: 0 }, node2: { x: 100, y: 0 } })
  })

  it("places a node that would cross the edge of the view on the next row", () => {
    const { nodePositions } = setup(["node1", "node2"], 110)
    expect(nodePositions.value).toEqual({ node1: { x: 0, y: 0 }, node2: { x: 0, y: 80 } })
  })

  it("does not avoid the position of a node that is not there", () => {
    const { nodePositions } = setup(["node1"], 130, { gone: { x: 0, y: 0 } })
    expect(nodePositions.value.node1).toEqual({ x: 0, y: 0 })
  })

  it("moves the nodes as they are dragged", () => {
    const { nodePositions, emitter } = setup(["node1"], 130)
    emitter.emit("node:dragstart", { node1: { x: 1, y: 2 } })
    expect(nodePositions.value.node1).toEqual({ x: 1, y: 2 })
    emitter.emit("node:pointermove", { node1: { x: 3, y: 4 } })
    expect(nodePositions.value.node1).toEqual({ x: 3, y: 4 })
    emitter.emit("node:dragend", { node1: { x: 5, y: 6 } })
    expect(nodePositions.value.node1).toEqual({ x: 5, y: 6 })
  })

  it("stops following the drags and the nodes once deactivated", async () => {
    const { layout, nodes, nodePositions, emitter } = setup(["node1"], 130)
    layout.deactivate()
    emitter.emit("node:dragstart", { node1: { x: 1, y: 2 } })
    emitter.emit("node:pointermove", { node1: { x: 3, y: 4 } })
    emitter.emit("node:dragend", { node1: { x: 5, y: 6 } })
    nodes.value = { ...nodes.value, node2: {} }
    await nextTick()
    expect(nodePositions.value).toEqual({ node1: { x: 0, y: 0 } })
  })
})
