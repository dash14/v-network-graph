import { describe, expect, test } from "vitest"
import { userEvent } from "vitest/browser"
import { mountGraph } from "./helpers/graph"

const nodes = { node1: {}, node2: {} }
const edges = { edge1: { source: "node1", target: "node2" } }
const layouts = { nodes: { node1: { x: -50, y: 0 }, node2: { x: 50, y: 0 } } }

function attributes(container: Element, selector: string, ...names: string[]) {
  return Array.from(container.querySelectorAll(selector), e =>
    Object.fromEntries(names.map(name => [name, e.getAttribute(name)]))
  )
}

describe("styles derived from the normal style follow its changes", () => {
  test("selected node, for the values it leaves unset", async () => {
    const { screen, state } = await mountGraph({
      nodes,
      layouts,
      configs: {
        node: { selectable: true, normal: { color: "#0000ff" }, selected: { radius: 20 } },
      },
      selectedNodes: ["node1"],
    })

    const circles = () => attributes(screen.container, ".v-ng-node circle", "r", "fill")
    await expect.poll(circles).toEqual([
      { r: "20", fill: "#0000ff" },
      { r: "16", fill: "#0000ff" },
    ])

    state.configs.node!.normal!.color = "#00ff00"
    await expect.poll(circles).toEqual([
      { r: "20", fill: "#00ff00" },
      { r: "16", fill: "#00ff00" },
    ])
  })

  test("hovered node", async () => {
    const { screen, state } = await mountGraph({ nodes, layouts, configs: { node: {} } })
    const radii = () => attributes(screen.container, ".v-ng-node circle", "r")

    await userEvent.hover(screen.container.querySelector(".v-ng-node circle")!)
    await expect.poll(radii).toEqual([{ r: "18" }, { r: "16" }])

    state.configs.node!.normal = { radius: 30 }
    await expect.poll(radii).toEqual([{ r: "32" }, { r: "30" }])
  })

  test("selected edge", async () => {
    const { screen, state } = await mountGraph({
      nodes,
      edges,
      layouts,
      configs: { edge: { selectable: true } },
      selectedEdges: ["edge1"],
    })

    const linecaps = () => attributes(screen.container, ".v-ng-line", "stroke-linecap")
    await expect.poll(linecaps).toEqual([{ "stroke-linecap": "butt" }])

    state.configs.edge!.normal = { linecap: "round" }
    await expect.poll(linecaps).toEqual([{ "stroke-linecap": "round" }])
  })

  test("selected path", async () => {
    const { screen, state } = await mountGraph({
      nodes,
      edges,
      paths: { path1: { edges: ["edge1"] } },
      layouts,
      configs: { path: { visible: true, selectable: true } },
      selectedPaths: ["path1"],
    })

    const linejoins = () => attributes(screen.container, ".v-ng-path", "stroke-linejoin")
    await expect.poll(linejoins).toEqual([{ "stroke-linejoin": "round" }])

    state.configs.path!.path = { linejoin: "miter" }
    await expect.poll(linejoins).toEqual([{ "stroke-linejoin": "miter" }])

    state.configs.path!.normal = { linejoin: "bevel" }
    await expect.poll(linejoins).toEqual([{ "stroke-linejoin": "bevel" }])
  })
})
