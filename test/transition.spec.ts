import { describe, expect, test } from "vitest"
import { nextTick } from "vue"
import { mountGraph } from "./helpers/graph"

const nodes = { node1: { name: "Node 1" } }
const layouts = { nodes: { node1: { x: 0, y: 0 } } }

async function addNode(state: Awaited<ReturnType<typeof mountGraph>>["state"]) {
  state.nodes.node2 = { name: "Node 2" }
  state.layouts.nodes.node2 = { x: 100, y: 0 }
  await nextTick()
}

describe("object transitions", () => {
  test("added nodes and labels enter with the configured transition", async () => {
    const configs = { node: { transition: "fade" } }
    const { screen, state } = await mountGraph({ nodes, layouts, configs })

    await addNode(state)
    const added = screen.container.querySelectorAll(".fade-enter-active")
    expect(added).toHaveLength(2)
    expect(added[0].closest(".v-ng-layer-nodes")).not.toBeNull()
    expect(added[1].closest(".v-ng-layer-node-labels")).not.toBeNull()
  })

  test("added nodes appear without transition classes when none is configured", async () => {
    const { screen, state } = await mountGraph({ nodes, layouts })

    await addNode(state)
    expect(screen.container.querySelectorAll(".v-ng-node")).toHaveLength(2)
    expect(screen.container.querySelector("[class*='-enter-']")).toBeNull()
  })
})
