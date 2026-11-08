import { describe, expect, onTestFinished, test, vi } from "vitest"
import { render } from "vitest-browser-vue"
import { userEvent } from "vitest/browser"
import { h, markRaw, nextTick, ref } from "vue"
import { VNetworkGraph } from "@/index"
import type { InputPaths, Node, Paths, ZOrderConfig } from "@/index"
import type { GraphProps } from "./helpers/graph"
import { at, catchErrors, mountGraph, payloadsOf } from "./helpers/graph"

const graph = (): GraphProps => ({
  nodes: { node1: { name: "Node 1" }, node2: { name: "Node 2" }, node3: { name: "Node 3" } },
  edges: {
    edge1: { source: "node1", target: "node2" },
    edge2: { source: "node2", target: "node3" },
  },
  layouts: {
    nodes: { node1: { x: -100, y: 0 }, node2: { x: 0, y: 0 }, node3: { x: 100, y: 0 } },
  },
})

function silenceWarnings() {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
  onTestFinished(() => warn.mockRestore())
  return warn
}

describe("z-order", () => {
  // node1 is the highest by its z-index; node3 is selected and node2 hovered.
  const mountOrdered = async (zOrder: Partial<ZOrderConfig<Node>>) => {
    const props = graph()
    props.nodes = {
      node1: { r: 10, z: 2 },
      node2: { r: 11, z: 1 },
      node3: { r: 12, z: 0 },
    }
    props.configs = {
      node: {
        selectable: true,
        normal: { radius: n => n.r },
        hover: { radius: n => n.r },
        selected: { radius: n => n.r },
        zOrder: {
          enabled: true,
          zIndex: n => n.z,
          bringToFrontOnHover: false,
          bringToFrontOnSelected: false,
          ...zOrder,
        },
      },
    }
    props.selectedNodes = ["node3"]
    const { screen, canvas } = await mountGraph(props)
    await userEvent.hover(canvas, { position: at(0, 0) })
    const order = () =>
      Array.from(screen.container.querySelectorAll(".v-ng-node circle"), c => c.getAttribute("r"))
    return order
  }

  test.each([
    { name: "by the z-index", zOrder: {}, order: ["12", "11", "10"] },
    {
      name: "the hovered in front",
      zOrder: { bringToFrontOnHover: true },
      order: ["12", "10", "11"],
    },
    {
      name: "the selected in front",
      zOrder: { bringToFrontOnSelected: true },
      order: ["11", "10", "12"],
    },
    {
      name: "the hovered in front of the selected",
      zOrder: { bringToFrontOnHover: true, bringToFrontOnSelected: true },
      order: ["10", "12", "11"],
    },
  ])("orders the nodes $name", async ({ zOrder, order }) => {
    const orderOf = await mountOrdered(zOrder)
    await expect.poll(orderOf).toEqual(order)
  })
})

describe("selection", () => {
  test("a selection may name a node that does not exist", async () => {
    const props = graph()
    props.configs = { node: { selectable: true } }
    props.selectedNodes = ["node1", "unknown"]
    const { screen, state } = await mountGraph(props)
    expect(screen.container.querySelectorAll(".v-ng-node.selected")).toHaveLength(1)

    state.selectedNodes = []
    await nextTick()
    expect(screen.container.querySelectorAll(".v-ng-node.selected")).toHaveLength(0)
  })

  test("takes a node added and selected in the same tick", async () => {
    const props = graph()
    props.configs = { node: { selectable: true } }
    const { screen, state } = await mountGraph(props)

    state.nodes.node4 = { name: "Node 4" }
    state.selectedNodes = ["node4"]
    await expect
      .poll(() => screen.container.querySelectorAll(".v-ng-node.selected"))
      .toHaveLength(1)
    expect(state.selectedNodes).toEqual(["node4"])
  })

  test.each([
    { kind: "nodes", selection: "selectedNodes", id: "node4", object: { name: "Node 4" } },
    {
      kind: "edges",
      selection: "selectedEdges",
      id: "edge3",
      object: { source: "node1", target: "node3" },
    },
    { kind: "paths", selection: "selectedPaths", id: "path2", object: { edges: ["edge2"] } },
  ] as const)(
    "drops a selected ID of $kind added in place without reactivity",
    async ({ kind, selection, id, object }) => {
      const errors = catchErrors()
      const props = graph()
      props.paths = { path1: { edges: ["edge1"] } }
      props.configs = {
        node: { selectable: true },
        edge: { selectable: true },
        path: { visible: true, selectable: true },
      }
      const { state, events } = await mountGraph(props)
      const raw: Record<string, any> = markRaw({ ...state[kind] })
      state[kind] = raw
      await nextTick()

      raw[id] = object
      const existing = Object.keys(state[kind])[0]
      state[selection] = [existing, id]
      await vi.waitUntil(() => state[selection].length === 1)
      expect(state[selection]).toEqual([existing])
      expect(payloadsOf(events, `${kind.slice(0, -1)}:select` as "node:select")).toEqual([
        [existing],
      ])
      expect(errors).toEqual([])
    }
  )
  test.each([
    { kind: "nodes", selection: "selectedNodes", id: "node4", object: { name: "Node 4" } },
    {
      kind: "edges",
      selection: "selectedEdges",
      id: "edge3",
      object: { source: "node1", target: "node3" },
    },
    { kind: "paths", selection: "selectedPaths", id: "path2", object: { edges: ["edge2"] } },
  ] as const)(
    "drops a selected ID of $kind added in place to a plain object",
    async ({ kind, selection, id, object }) => {
      const errors = catchErrors()
      // Plain objects, which the graph gets as they are.
      const { nodes, edges, layouts } = graph()
      const data: Record<string, Record<string, any>> = {
        nodes,
        edges: edges!,
        paths: { path1: { edges: ["edge1"] } },
        layouts,
      }
      const selected = ref<string[]>([])
      const screen = await render(() =>
        h(VNetworkGraph, {
          ...data,
          configs: {
            node: { selectable: true },
            edge: { selectable: true },
            path: { visible: true, selectable: true },
          },
          [selection]: selected.value,
          [`onUpdate:${selection}`]: (v: string[]) => (selected.value = v),
        })
      )
      await expect.poll(() => screen.container.querySelector(".v-ng-path")).not.toBeNull()

      data[kind][id] = object
      const existing = Object.keys(data[kind])[0]
      selected.value = [existing, id]
      await vi.waitUntil(() => selected.value.length === 1)
      expect(selected.value).toEqual([existing])
      expect(errors).toEqual([])
    }
  )
})

describe("removal", () => {
  test("removes a hovered node and a selected path with the edges", async () => {
    const props = graph()
    props.paths = { path1: { edges: ["edge1", "edge2"] } }
    props.configs = { path: { visible: true, selectable: true } }
    props.selectedPaths = ["path1"]
    const { screen, state, canvas } = await mountGraph(props)
    await userEvent.hover(canvas, { position: at(-100, 0) })
    await expect.poll(() => screen.container.querySelectorAll(".v-ng-node.hover")).toHaveLength(1)

    delete state.nodes.node1
    delete state.edges.edge1
    delete (state.paths as Paths).path1
    await nextTick()
    expect(screen.container.querySelectorAll(".v-ng-node")).toHaveLength(2)
    expect(screen.container.querySelectorAll(".v-ng-path")).toHaveLength(0)
    expect(state.selectedPaths).toEqual([])
  })
})

describe("removal and addition", () => {
  test("a node added again after it was removed while hovered is not brought to the front", async () => {
    const props = graph()
    // node1 is the lowest by its z-index.
    props.nodes = { node1: { r: 10, z: -1 }, node2: { r: 11, z: 0 }, node3: { r: 12, z: 0 } }
    props.configs = {
      node: {
        normal: { radius: n => n.r },
        hover: { radius: n => n.r },
        zOrder: { enabled: true, zIndex: n => n.z, bringToFrontOnHover: true },
      },
    }
    const { screen, state, canvas } = await mountGraph(props)
    await userEvent.hover(canvas, { position: at(-100, 0) })
    await expect.poll(() => screen.container.querySelectorAll(".v-ng-node.hover")).toHaveLength(1)

    delete state.nodes.node1
    await nextTick()
    // Away from the pointer.
    state.layouts.nodes.node1 = { x: -100, y: 100 }
    state.nodes.node1 = { r: 10, z: -1 }
    await nextTick()

    const order = Array.from(screen.container.querySelectorAll(".v-ng-node circle"), c =>
      c.getAttribute("r")
    )
    expect(order).toEqual(["10", "11", "12"])
  })
})

describe("invalid styles", () => {
  test("a shape with no stroke color is drawn without a stroke", async () => {
    const props = graph()
    props.configs = { node: { normal: { strokeWidth: 2, strokeColor: () => undefined } } }
    const { screen } = await mountGraph(props)

    expect(screen.container.querySelector(".v-ng-node circle")?.getAttribute("stroke")).toBe("none")
  })
})

describe("paths given as an array", () => {
  test("are taken by their ids", async () => {
    const warn = silenceWarnings()
    const props = graph()
    props.paths = [
      { id: "path1", edges: ["edge1", "edge2"] },
      { id: "path2", edges: ["edge2"] },
    ] as InputPaths
    props.configs = { path: { visible: true } }
    const { screen } = await mountGraph(props)

    expect(screen.container.querySelectorAll(".v-ng-path")).toHaveLength(2)
    expect(warn).not.toHaveBeenCalled()
  })

  test("without ids keep the ids made for them, with a warning", async () => {
    const warn = silenceWarnings()
    const path1 = { edges: ["edge1", "edge2"] }
    const path2 = { edges: ["edge2"] }
    const props = graph()
    props.paths = [path1, path2] as InputPaths
    props.configs = { path: { visible: true, selectable: true } }
    const { screen, state } = await mountGraph(props)
    expect(warn).toHaveBeenCalledOnce()
    expect(screen.container.querySelectorAll(".v-ng-path")).toHaveLength(2)

    // path1 keeps its id, which stays selected.
    state.selectedPaths = ["path-1"]
    state.paths = [path1] as InputPaths
    await nextTick()
    expect(screen.container.querySelectorAll(".v-ng-path")).toHaveLength(1)
    expect(state.selectedPaths).toEqual(["path-1"])

    // path2 given again gets a new id.
    state.paths = [path1, path2] as InputPaths
    await nextTick()
    expect(screen.container.querySelectorAll(".v-ng-path")).toHaveLength(2)
    expect(warn).toHaveBeenCalledOnce()
  })
})

describe("layers", () => {
  test("ignores a built-in layer that does not exist, with a warning", async () => {
    const warn = silenceWarnings()
    const props = graph()
    props.configs = { view: { builtInLayerOrder: ["unknown" as "nodes", "edges"] } }
    const { screen } = await mountGraph(props)

    expect(warn).toHaveBeenCalledOnce()
    expect(warn).toHaveBeenCalledWith("Layer unknown is not a built-in layer.")
    expect(screen.container.querySelectorAll(".v-ng-node")).toHaveLength(3)
  })

  test("takes a built-in layer order changed to a shorter one as it is", async () => {
    const layerOrder = (container: Element) =>
      Array.from(container.querySelectorAll("[class^='v-ng-layer-']"), e => e.getAttribute("class"))
    const props = graph()
    props.configs = { view: { builtInLayerOrder: ["nodes"] } }
    const fresh = await mountGraph(props)
    const expected = layerOrder(fresh.screen.container)
    fresh.screen.unmount()

    // Not merged into the previous one item by item.
    props.configs = { view: { builtInLayerOrder: ["edges", "node-labels"] } }
    const { screen, state } = await mountGraph(props)
    state.configs.view!.builtInLayerOrder = ["nodes"]
    await nextTick()

    expect(layerOrder(screen.container)).toEqual(expected)
  })

  test.each(["background", "grid"] as const)(
    "draws the background only when a slot is in the %s layer, without the grid shown",
    async layer => {
      const props = graph()
      const { screen } = await mountGraph(props)
      expect(screen.container.querySelector(".v-ng-background-viewport")).toBeNull()
      screen.unmount()

      props.layers = { behind: layer }
      const mounted = await mountGraph(props, { slots: { behind: () => h("rect") } })
      expect(mounted.screen.container.querySelector(".v-ng-background-viewport")).not.toBeNull()
    }
  )

  test("draws the slots of the same layer in their order", async () => {
    const props = graph()
    props.layers = { first: "nodes", second: "nodes" }
    const { screen } = await mountGraph(props, {
      slots: {
        first: () => h("rect", { class: "first" }),
        second: () => h("rect", { class: "second" }),
      },
    })

    const rects = screen.container.querySelectorAll("rect.first, rect.second")
    expect(Array.from(rects, r => r.getAttribute("class"))).toEqual(["first", "second"])
  })
})

describe("labels", () => {
  // The first line moves up by the lines below it, by half of them, or not at all.
  test.each([
    { direction: "north", lite: false, shift: -2 },
    { direction: "center", lite: false, shift: -1 },
    { direction: "south", lite: false, shift: 0 },
    { direction: "north", lite: true, shift: -2 },
    { direction: "center", lite: true, shift: -1 },
    { direction: "south", lite: true, shift: 0 },
  ] as const)(
    "a label of three lines to the $direction (lite: $lite) puts its first line by its baseline",
    async ({ direction, lite, shift }) => {
      const props = graph()
      props.nodes.node1.name = "first\nsecond\nthird"
      props.configs = { node: { label: { text: "name", direction } } }
      const { screen } = await mountGraph(props, { lite })

      const lines = Array.from(screen.container.querySelectorAll("tspan"), t =>
        Number(t.getAttribute("dy"))
      )
      expect(lines).toHaveLength(3)
      expect(lines[0]).toBeCloseTo(shift * lines[1])
    }
  )
})
