import { describe, test } from "vitest"
import { mountGraph } from "../helpers/graph"
import { waitUntilStill } from "../helpers/render"
import { expectGraphToMatchSnapshot } from "../helpers/snapshot"

// The fit and the export include the labels, whose size depends on the fonts.
const nodes = { node1: { name: "Node 1" }, node2: { name: "Node 2" }, node3: { name: "Node 3" } }
const edges = {
  edge1: { source: "node1", target: "node2" },
  edge2: { source: "node2", target: "node3" },
}
const layouts = {
  nodes: { node1: { x: 0, y: 50 }, node2: { x: 100, y: 50 }, node3: { x: 200, y: 50 } },
}

describe("methods with labels", () => {
  test("fitToContents", async () => {
    const { screen, graph } = await mountGraph({ nodes, edges, layouts })

    await graph.fitToContents()
    await waitUntilStill(screen.container)

    await expectGraphToMatchSnapshot(screen.container, "docker/methods/fit-to-contents", {
      pan: true,
    })
  })

  test("getAsSvg", async () => {
    const { graph } = await mountGraph({ nodes, edges, layouts })

    const exported = document.createElement("div")
    exported.innerHTML = graph.getAsSvg()

    await expectGraphToMatchSnapshot(exported, "docker/methods/get-as-svg", { pan: true })
  })
})
