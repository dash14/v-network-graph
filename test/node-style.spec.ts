import { describe, expect, test } from "vitest"
import { mountGraph } from "./helpers/graph"

describe("selected node style", () => {
  test("follows changes to the normal style for the values it leaves unset", async () => {
    const { screen, state } = await mountGraph({
      nodes: { node1: {}, node2: {} },
      layouts: { nodes: { node1: { x: -50, y: 0 }, node2: { x: 50, y: 0 } } },
      configs: {
        node: { selectable: true, normal: { color: "#0000ff" }, selected: { radius: 20 } },
      },
      selectedNodes: ["node1"],
    })
    const circles = () =>
      Array.from(screen.container.querySelectorAll(".v-ng-node circle"), c => ({
        r: c.getAttribute("r"),
        fill: c.getAttribute("fill"),
      }))

    state.configs.node!.normal!.color = "#00ff00"
    await expect.poll(circles).toEqual([
      { r: "20", fill: "#00ff00" },
      { r: "16", fill: "#00ff00" },
    ])
  })
})
