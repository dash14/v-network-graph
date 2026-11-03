import type { Simulation } from "d3-force"
import { describe, expect, test } from "vitest"
import { userEvent } from "vitest/browser"
import { nextTick } from "vue"
import { GridLayout, SimpleLayout } from "@/index"
import type { LayoutHandler } from "@/index"
import type { ForceEdgeDatum, ForceLayoutParameters, ForceNodeDatum } from "@/layouts/force"
import { ForceLayout } from "@/layouts/force"
import type { GraphProps } from "./helpers/graph"
import { at, drag, mountGraph } from "./helpers/graph"

const graph = (layoutHandler: LayoutHandler, lite = false): GraphProps => ({
  nodes: { node1: { name: "Node 1" }, node2: { name: "Node 2" } },
  edges: { edge1: { source: "node1", target: "node2" } },
  layouts: { nodes: { node1: { x: -100, y: 0 }, node2: { x: 100, y: 0 } } },
  configs: {
    node: { selectable: true },
    view: { layoutHandler, ...(lite && { layoutsUpdateInterval: 60000 }) },
  },
})

describe("force layout", () => {
  type Sim = Simulation<ForceNodeDatum, ForceEdgeDatum>

  /** A layout whose simulation moves nothing, so that the nodes stay where the test puts them. */
  const stopped = (options: ForceLayoutParameters = {}) => {
    const holder: { simulation?: Sim } = {}
    const layout = new ForceLayout({
      createSimulation: (d3, nodes) =>
        (holder.simulation = d3.forceSimulation(nodes).velocityDecay(1).stop()),
      ...options,
    })
    const simNode = (id: string) => holder.simulation!.nodes().find(n => n.id === id)!
    return { layout, simNode }
  }

  test("a node dropped is left to the simulation", async () => {
    const { layout, simNode } = stopped()
    const { canvas } = await mountGraph(graph(layout))

    await drag(canvas, at(-100, 0), at(-50, 30))
    expect(simNode("node1")).toMatchObject({ x: -50, y: 30 })
    expect(simNode("node1").fx).toBeUndefined()
  })

  test("with noAutoRestartSimulation, a drag moves the node in the layouts", async () => {
    const { layout } = stopped({ noAutoRestartSimulation: true })
    const { canvas, state } = await mountGraph(graph(layout))

    await drag(canvas, at(-100, 0), at(-50, 30))
    expect(state.layouts.nodes.node1).toMatchObject({ x: -50, y: 30 })
  })

  test("a click with the alt key fixes a node, and another unfixes it", async () => {
    const { layout, simNode } = stopped({ positionFixedByClickWithAltKey: true })
    const { canvas, state } = await mountGraph(graph(layout))

    await userEvent.click(canvas, { position: at(-100, 0) })
    expect(state.layouts.nodes.node1.fixed).toBeUndefined()

    await userEvent.click(canvas, { position: at(-100, 0), modifiers: ["Alt"] })
    expect(state.layouts.nodes.node1.fixed).toBe(true)
    expect(simNode("node1")).toMatchObject({ fx: -100, fy: 0 })

    await userEvent.click(canvas, { position: at(-100, 0), modifiers: ["Alt"] })
    expect(state.layouts.nodes.node1.fixed).toBeUndefined()
    expect(simNode("node1")).toMatchObject({ x: -100, y: 0 })
    expect(simNode("node1").fx).toBeUndefined()
  })

  test("a click with the alt key fixes a node not yet in the layouts", async () => {
    const { layout } = stopped({
      positionFixedByClickWithAltKey: true,
      noAutoRestartSimulation: true,
    })
    const { screen, canvas, state } = await mountGraph(graph(layout))

    state.nodes.node3 = { name: "Node 3" }
    await nextTick()
    // Drawn at the origin, where the stopped simulation leaves it.
    await expect.poll(() => screen.container.querySelectorAll(".v-ng-node")).toHaveLength(3)
    await userEvent.click(canvas, { position: at(0, 0), modifiers: ["Alt"] })
    expect(state.layouts.nodes.node3).toMatchObject({ fixed: true })
  })

  test("a simulation without the force of the edges takes changes of the edges", async () => {
    const layout = new ForceLayout({
      createSimulation: (d3, nodes) => d3.forceSimulation(nodes).stop(),
    })
    const { screen, state } = await mountGraph(graph(layout))

    state.edges.edge2 = { source: "node2", target: "node1" }
    await nextTick()
    await expect.poll(() => screen.container.querySelectorAll(".v-ng-edge")).toHaveLength(2)
  })

  test("a simulation made without the nodes puts the nodes not in the layouts at the origin", async () => {
    const layout = new ForceLayout({
      createSimulation: d3 => d3.forceSimulation<ForceNodeDatum, ForceEdgeDatum>().stop(),
    })
    const props = graph(layout)
    props.layouts = { nodes: {} }
    const { state } = await mountGraph(props)

    expect(state.layouts.nodes).toEqual({ node1: { x: 0, y: 0 }, node2: { x: 0, y: 0 } })
  })

  test("a removed node is dropped from the simulation", async () => {
    const { layout } = stopped()
    const { screen, state } = await mountGraph(graph(layout))

    delete state.nodes.node2
    delete state.layouts.nodes.node2
    await nextTick()
    await expect.poll(() => screen.container.querySelectorAll(".v-ng-node")).toHaveLength(1)
  })

  test("drawn ahead of the layouts, the nodes the simulation has not placed are at the origin", async () => {
    const layout = new ForceLayout({
      createSimulation: d3 => d3.forceSimulation<ForceNodeDatum, ForceEdgeDatum>().stop(),
    })
    const props = graph(layout, true)
    props.layouts = { nodes: {} }
    // An edge to a node that is not there, whose end is asked for and has no position.
    props.edges!.edge2 = { source: "node1", target: "missing" }
    const { screen } = await mountGraph(props, { lite: true })

    layout.ticked()
    layout.ticked()
    const drawn = Array.from(screen.container.querySelectorAll(".v-ng-node"), n =>
      n.getAttribute("transform")
    )
    expect(drawn).toEqual(["translate(0 0)", "translate(0 0)"])
  })

  test("deactivating it before it is activated does nothing", () => {
    expect(() => new ForceLayout().deactivate()).not.toThrow()
  })
})

describe("simple layout", () => {
  test("places new nodes beside the others, and wraps them at the edge of the view", async () => {
    const props = graph(new SimpleLayout())
    // A position of a node that is not there, which the new nodes do not avoid.
    props.layouts = { nodes: { gone: { x: 0, y: 0 } } }
    props.nodes = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`node${i}`, {}]))
    const { state } = await mountGraph(props)

    const positions = Object.values(state.layouts.nodes).slice(1)
    const rows = new Set(positions.map(p => p.y))
    expect(rows.size).toBeGreaterThan(1)
    expect(new Set(positions.map(p => `${p.x},${p.y}`)).size).toBe(12)
  })

  test("places a node added later", async () => {
    const { state } = await mountGraph(graph(new SimpleLayout()))

    state.nodes.node3 = { name: "Node 3" }
    await nextTick()
    await expect.poll(() => state.layouts.nodes.node3).toBeDefined()
  })

  test("places a node added later at the center of the panned view", async () => {
    const { graph: instance, state } = await mountGraph(graph(new SimpleLayout()))

    instance.panTo({ x: 100, y: 50 })
    state.nodes.node3 = { name: "Node 3" }
    await nextTick()
    // The container is 600 by 400, so the center of the view is at (300 - 100, 200 - 50).
    await expect.poll(() => state.layouts.nodes.node3).toEqual({ x: 200, y: 150 })
  })

  test("deactivating it before it is activated does nothing", () => {
    expect(() => new SimpleLayout().deactivate()).not.toThrow()
  })
})

describe("grid layout", () => {
  test("snaps a dragged node to a grid of 10 by default", async () => {
    const { canvas, state } = await mountGraph(graph(new GridLayout()))

    await drag(canvas, at(-100, 0), at(-53, 27))
    expect(state.layouts.nodes.node1).toEqual({ x: -60, y: 20 })
  })
})
