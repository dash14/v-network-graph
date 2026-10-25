import type { Simulation } from "d3-force"
import mitt from "mitt"
import { afterEach, describe, expect, it, vi } from "vitest"
import { nextTick, ref } from "vue"
import { getFullConfigs } from "@/common/config-defaults"
import { Edges, Events, NodePositions, Nodes } from "@/common/types"
import { ForceEdgeDatum, ForceLayout, ForceNodeDatum } from "./force"
import { PositionDrawer, PositionOf } from "./handler"

function setup(drawerInterval?: number) {
  let simulation: Simulation<ForceNodeDatum, ForceEdgeDatum> | undefined
  // Stopped, so that the test ticks it.
  const layout = new ForceLayout({
    createSimulation: (d3, nodes, edges) =>
      (simulation = d3
        .forceSimulation(nodes)
        .force(
          "edge",
          d3.forceLink<ForceNodeDatum, ForceEdgeDatum>(edges).id(d => d.id)
        )
        .force("charge", d3.forceManyBody())
        .stop()),
  })
  const nodes = ref<Nodes>({ node1: {}, node2: {}, node3: {} })
  const edges = ref<Edges>({
    edge1: { source: "node1", target: "node2" },
    edge2: { source: "node2", target: "node3" },
  })
  const nodePositions = ref<NodePositions>({})
  const emitter = mitt<Events>()
  const drawn: PositionOf[] = []
  let flush: (() => void) | undefined
  const positionDrawer: PositionDrawer | undefined =
    drawerInterval === undefined
      ? undefined
      : {
          interval: drawerInterval,
          draw: positionOf => drawn.push(positionOf),
          setFlush: f => (flush = f),
        }

  layout.activate({
    layouts: nodePositions.value,
    nodePositions,
    nodes,
    edges,
    configs: getFullConfigs(),
    scale: ref(1),
    emitter,
    svgPanZoom: {} as any,
    positionDrawer,
  })

  const tick = () => {
    simulation!.tick()
    layout.ticked()
  }
  const simulated = (id: string) => {
    const node = simulation!.nodes().find(n => n.id === id)!
    return { x: node.x, y: node.y }
  }
  const layoutOf = (id: string) => {
    const p = nodePositions.value[id]
    return { x: p.x, y: p.y }
  }
  return {
    layout,
    nodes,
    nodePositions,
    drawn,
    flush: () => flush?.(),
    tick,
    simulated,
    layoutOf,
    simulation: () => simulation!,
    emitter,
  }
}

describe("ForceLayout", () => {
  let deactivate: (() => void) | undefined
  afterEach(() => {
    deactivate?.()
    deactivate = undefined
    vi.useRealTimers()
  })
  const start = (drawerInterval?: number) => {
    const s = setup(drawerInterval)
    deactivate = () => s.layout.deactivate()
    return s
  }

  it("updates the layouts on every tick without a drawer", () => {
    const { tick, simulated, layoutOf } = start()
    tick()
    expect(layoutOf("node1")).toEqual(simulated("node1"))
  })

  describe("with a drawer", () => {
    it("draws the ticks within the interval, without updating the layouts", () => {
      const { tick, simulated, layoutOf, drawn } = start(10000)
      const before = layoutOf("node1")
      tick()
      expect(layoutOf("node1")).toEqual(before)
      expect(drawn).toHaveLength(1)
      expect(drawn[0]("node1")).toEqual(simulated("node1"))
      expect(drawn[0]("unknown")).toBeUndefined()
    })

    it("updates the layouts once the interval has passed", () => {
      vi.useFakeTimers()
      const { tick, simulated, layoutOf } = start(100)
      tick()
      expect(layoutOf("node1")).not.toEqual(simulated("node1"))
      vi.advanceTimersByTime(100)
      expect(layoutOf("node1")).toEqual(simulated("node1"))
    })

    it("updates the layouts when flushed", () => {
      const { tick, simulated, layoutOf, flush } = start(10000)
      tick()
      flush()
      expect(layoutOf("node1")).toEqual(simulated("node1"))
    })

    it("tells a dragged node at the pointer before the next tick", () => {
      const { tick, drawn, emitter } = start(10000)
      tick()
      emitter.emit("node:pointermove", { node1: { x: 500, y: 600 } })
      expect(drawn[0]("node1")).toEqual({ x: 500, y: 600 })
    })

    it("tells no position to draw once the layouts are up to date", () => {
      const { tick, flush, drawn } = start(10000)
      tick()
      flush()
      expect(drawn[0]("node1")).toBeUndefined()
    })

    it("keeps the drawn positions when the simulation is rebuilt", async () => {
      const { tick, simulated, layoutOf, nodes } = start(10000)
      tick()
      const drawnPosition = simulated("node1")
      nodes.value = { ...nodes.value, node4: {} }
      await nextTick()
      expect(simulated("node1")).toEqual(drawnPosition)
      // Left to follow as they would, not caught up for the rebuild.
      expect(layoutOf("node1")).not.toEqual(drawnPosition)
    })

    it("keeps the drawn positions when the simulation is rebuilt again before the layouts follow", async () => {
      const { tick, simulated, layoutOf, nodes } = start(10000)
      tick()
      nodes.value = { ...nodes.value, node4: {} }
      await nextTick()
      tick()
      const drawnPosition = simulated("node1")
      nodes.value = { ...nodes.value, node5: {} }
      await nextTick()
      expect(simulated("node1")).toEqual(drawnPosition)
      expect(layoutOf("node1")).not.toEqual(drawnPosition)
    })

    it("keeps the velocities when the simulation is rebuilt", async () => {
      const { tick, nodes, simulation } = start(10000)
      tick()
      const velocity = () => {
        const node = simulation()
          .nodes()
          .find(n => n.id === "node1")!
        return { vx: node.vx, vy: node.vy }
      }
      const before = velocity()
      nodes.value = { ...nodes.value, node4: {} }
      await nextTick()
      expect(velocity()).toEqual(before)
    })

    it("leaves the position of a node the user moved, when the simulation is rebuilt", async () => {
      const { tick, simulated, layoutOf, nodes, nodePositions } = start(10000)
      tick()
      nodePositions.value.node1.x = 500
      nodePositions.value.node1.y = 600
      nodes.value = { ...nodes.value, node4: {} }
      await nextTick()
      expect(layoutOf("node1")).toEqual({ x: 500, y: 600 })
      expect(simulated("node1")).toEqual({ x: 500, y: 600 })
    })
  })
})
