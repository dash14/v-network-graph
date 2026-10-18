import { describe, expect, test } from "vitest"
import { render } from "vitest-browser-vue"
import { defineComponent, h, ref } from "vue"
import { VNetworkGraph, VNetworkGraphInstance } from "@/index"

const nodes = {
  node1: { name: "Node 1" },
  node2: { name: "Node 2" },
}
const edges = {
  edge1: { source: "node1", target: "node2" },
}
const layouts = {
  nodes: {
    node1: { x: 0, y: 0 },
    node2: { x: 100, y: 0 },
  },
}

async function renderGraph() {
  let resolveLoaded: () => void
  const loaded = new Promise<void>(resolve => (resolveLoaded = resolve))
  const graph = ref<VNetworkGraphInstance>()
  const screen = await render(
    defineComponent(
      () => () =>
        h("div", { style: { width: "400px", height: "300px" } }, [
          h(VNetworkGraph, {
            ref: graph,
            nodes,
            edges,
            layouts,
            eventHandlers: { "view:load": () => resolveLoaded() },
          }),
        ])
    )
  )
  await loaded
  return { screen, graph: graph.value! }
}

describe("VNetworkGraph", () => {
  test("renders nodes, edges and labels", async () => {
    const { screen } = await renderGraph()

    await expect.element(screen.getByText("Node 1")).toBeVisible()
    await expect.element(screen.getByText("Node 2")).toBeVisible()
    expect(screen.container.querySelectorAll(".v-ng-node")).toHaveLength(2)
    expect(screen.container.querySelectorAll(".v-ng-edge")).toHaveLength(1)
  })

  test("returns the rendered graph as an SVG string", async () => {
    const { graph } = await renderGraph()

    const svg = graph.getAsSvg()

    expect(svg).toMatch(/^<svg[\s>]/)
    expect(svg).toContain("Node 1")
    expect(svg).toContain("Node 2")
  })
})
