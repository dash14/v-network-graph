import { afterEach, describe, expect, test, vi } from "vitest"
import { nextTick } from "vue"
import { mountGraph } from "./helpers/graph"

const nodes = { node1: { name: "Node 1" } }
const layouts = { nodes: { node1: { x: 0, y: 0 } } }

async function addNode(state: Awaited<ReturnType<typeof mountGraph>>["state"]) {
  state.nodes.node2 = { name: "Node 2" }
  state.layouts.nodes.node2 = { x: 100, y: 0 }
  await nextTick()
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe("object transitions", () => {
  test("added nodes and labels enter with the configured transition", async () => {
    const configs = { node: { transition: "fade" } }
    const { screen, state } = await mountGraph({ nodes, layouts, configs })

    await addNode(state)
    const entering = (layer: string) =>
      screen.container.querySelectorAll(`.${layer} .fade-enter-active`).length
    expect(entering("v-ng-layer-nodes")).toBe(1)
    expect(entering("v-ng-layer-node-labels")).toBe(1)
  })

  test("adding a node without a transition does not measure the other nodes", async () => {
    const { screen, state } = await mountGraph({ nodes, layouts })
    const measured: Element[] = []
    const measure = Element.prototype.getBoundingClientRect
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (
      this: Element
    ) {
      measured.push(this)
      return measure.call(this)
    })

    await addNode(state)
    expect(screen.container.querySelectorAll(".v-ng-node")).toHaveLength(2)
    expect(screen.container.querySelector("[class*='-enter-']")).toBeNull()
    expect(measured.filter(e => e.closest(".v-ng-layer-nodes, .v-ng-layer-node-labels"))).toEqual(
      []
    )
  })
})
