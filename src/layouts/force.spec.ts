import type * as d3 from "d3-force"
import type { Simulation } from "d3-force"
import mitt from "mitt"
import { afterEach, describe, expect, it, vi } from "vitest"
import { nextTick, ref } from "vue"
import { Reactive } from "@/common/common"
import { getFullConfigs } from "@/common/config-defaults"
import { Edges, Events, NodePositions, Nodes } from "@/common/types"
import { ForceEdgeDatum, ForceLayout, ForceLayoutParameters, ForceNodeDatum } from "./force"
import { PositionDrawer, PositionOf } from "./handler"

function setup(drawerInterval?: number, options: ForceLayoutParameters = {}) {
  let simulation: Simulation<ForceNodeDatum, ForceEdgeDatum> | undefined
  // Stopped, so that the test ticks it.
  const layout = new ForceLayout({
    ...options,
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
    layouts: Reactive(nodePositions.value),
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
    edges,
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
  const start = (drawerInterval?: number, options?: ForceLayoutParameters) => {
    const s = setup(drawerInterval, options)
    deactivate = () => s.layout.deactivate()
    return s
  }

  it("updates the layouts on every tick without a drawer", () => {
    const { tick, simulated, layoutOf } = start()
    tick()
    expect(layoutOf("node1")).toEqual(simulated("node1"))
  })

  const datum = (s: ReturnType<typeof setup>, id: string) =>
    s
      .simulation()
      .nodes()
      .find(n => n.id === id)!
  // So that the simulation does not run in the background.
  const spyRestart = (s: ReturnType<typeof setup>) =>
    vi.spyOn(s.simulation(), "restart").mockReturnThis()

  it("pins a dragged node at the pointer and restarts the simulation gently", () => {
    const s = start()
    const restart = spyRestart(s)
    s.emitter.emit("node:dragstart", { node1: { x: 500, y: 600 } })
    expect(datum(s, "node1")).toMatchObject({ fx: 500, fy: 600 })
    expect(restart).toHaveBeenCalledOnce()
    expect(s.simulation().alpha()).toBe(0.1)
  })

  it("releases a dropped node where it was dropped", () => {
    const s = start()
    const restart = spyRestart(s)
    s.emitter.emit("node:pointermove", { node1: { x: 500, y: 600 } })
    s.emitter.emit("node:dragend", { node1: { x: 510, y: 610 } })
    expect(datum(s, "node1")).toMatchObject({ x: 510, y: 610 })
    expect(datum(s, "node1").fx).toBeUndefined()
    expect(s.nodePositions.value.node1.fixed).toBeUndefined()
    expect(restart).toHaveBeenCalledTimes(2)
  })

  it("fixes a dropped node with positionFixedByDrag", () => {
    const s = start(undefined, { positionFixedByDrag: true })
    spyRestart(s)
    s.emitter.emit("node:dragend", { node1: { x: 510, y: 610 } })
    expect(datum(s, "node1")).toMatchObject({ fx: 510, fy: 610 })
    expect(s.nodePositions.value.node1.fixed).toBe(true)
  })

  it("moves the layouts without restarting the simulation with noAutoRestartSimulation", () => {
    const s = start(undefined, { noAutoRestartSimulation: true })
    const restart = spyRestart(s)
    s.emitter.emit("node:pointermove", { node1: { x: 500, y: 600 } })
    s.emitter.emit("node:dragend", { node1: { x: 500, y: 600 } })
    expect(s.layoutOf("node1")).toEqual({ x: 500, y: 600 })
    expect(datum(s, "node1").fx).toBeUndefined()
    expect(restart).not.toHaveBeenCalled()
  })

  it("fixes and unfixes a node clicked with the alt key with positionFixedByClickWithAltKey", () => {
    const s = start(undefined, { positionFixedByClickWithAltKey: true })
    const restart = spyRestart(s)
    const click = (altKey: boolean) =>
      s.emitter.emit("node:click", { node: "node1", event: { altKey } as MouseEvent })
    const { x, y } = s.layoutOf("node1")

    click(false)
    expect(s.nodePositions.value.node1.fixed).toBeUndefined()
    click(true)
    expect(s.nodePositions.value.node1.fixed).toBe(true)
    expect(datum(s, "node1")).toMatchObject({ fx: x, fy: y })
    click(true)
    expect(s.nodePositions.value.node1.fixed).toBeUndefined()
    expect(datum(s, "node1").fx).toBeUndefined()
    expect(restart).toHaveBeenCalledTimes(2)
  })

  it("fixes and unfixes a node by the fixed flag of its position", async () => {
    const s = start()
    spyRestart(s)
    const { x, y } = s.layoutOf("node1")
    s.nodePositions.value.node1.fixed = true
    await nextTick()
    expect(datum(s, "node1")).toMatchObject({ fx: x, fy: y })
    s.nodePositions.value.node1.fixed = false
    await nextTick()
    expect(datum(s, "node1").fx).toBeUndefined()
  })

  it("links the nodes by the edges as they change, leaving out those to missing nodes", async () => {
    const s = start()
    const restart = spyRestart(s)
    const links = () =>
      s
        .simulation()
        .force<d3.ForceLink<ForceNodeDatum, d3.SimulationLinkDatum<ForceNodeDatum>>>("edge")!
        .links()
        .map(l => [(l.source as ForceNodeDatum).id, (l.target as ForceNodeDatum).id])
    // Changed in place, so that only the new ends show the change.
    s.edges.value.edge1.target = "node3"
    s.edges.value.edge2.target = "unknown"
    await nextTick()
    expect(links()).toEqual([["node1", "node3"]])
    expect(restart).toHaveBeenCalledOnce()
  })

  it("stops the simulation and no longer follows the events or the nodes once deactivated", async () => {
    const s = setup(undefined, { positionFixedByClickWithAltKey: true })
    const restart = spyRestart(s)
    const stop = vi.spyOn(s.simulation(), "stop")
    const before = { ...datum(s, "node1") }
    s.layout.deactivate()
    expect(stop).toHaveBeenCalledOnce()
    expect(s.simulation().on("end.v-network-graph")).toBeUndefined()

    s.emitter.emit("node:dragstart", { node1: { x: 500, y: 600 } })
    s.emitter.emit("node:pointermove", { node1: { x: 500, y: 600 } })
    s.emitter.emit("node:dragend", { node1: { x: 500, y: 600 } })
    s.emitter.emit("node:click", { node: "node1", event: { altKey: true } as MouseEvent })
    s.nodes.value = { ...s.nodes.value, node4: {} }
    await nextTick()
    expect(datum(s, "node1")).toEqual(before)
    expect(s.nodePositions.value.node1.fixed).toBeUndefined()
    expect(s.simulation().nodes()).toHaveLength(3)
    expect(restart).not.toHaveBeenCalled()
    expect(() => s.layout.ticked()).not.toThrow()
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

    it("updates the layouts at once on the tick the interval has passed", () => {
      vi.useFakeTimers()
      const { tick, simulated, layoutOf } = start(100)
      vi.advanceTimersByTime(100)
      tick()
      expect(layoutOf("node1")).toEqual(simulated("node1"))
    })

    it("waits only for the rest of the interval", () => {
      vi.useFakeTimers()
      const { tick, simulated, layoutOf } = start(100)
      vi.advanceTimersByTime(60)
      tick()
      vi.advanceTimersByTime(39)
      expect(layoutOf("node1")).not.toEqual(simulated("node1"))
      vi.advanceTimersByTime(1)
      expect(layoutOf("node1")).toEqual(simulated("node1"))
    })

    it("leaves the layouts as they are after a flush, until the next tick", () => {
      vi.useFakeTimers()
      const { tick, layoutOf, nodePositions, flush } = start(100)
      tick()
      flush()
      nodePositions.value.node1.x = 500
      flush()
      vi.advanceTimersByTime(100)
      expect(layoutOf("node1").x).toBe(500)
    })

    it("brings the layouts up to date when deactivated", () => {
      const { tick, simulated, layoutOf, layout } = start(10000)
      tick()
      layout.deactivate()
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
