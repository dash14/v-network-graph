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
  document.querySelectorAll("style[data-test]").forEach(e => e.remove())
})

/** Lets a transition last long enough to be seen in progress. */
function addStyle(css: string) {
  const style = document.createElement("style")
  style.dataset.test = ""
  style.textContent = css
  document.head.appendChild(style)
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

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

  test("leaving nodes and labels stay at their positions while they leave", async () => {
    addStyle(".fade-leave-active { transition: opacity 1s linear; } .fade-leave-to { opacity: 0; }")
    const configs = { node: { transition: "fade", label: { visible: true } } }
    const { screen, state } = await mountGraph({ nodes, layouts, configs })
    await addNode(state)

    delete state.nodes.node2
    await nextTick()
    const leaving = [...screen.container.querySelectorAll(".fade-leave-active")]
    expect(leaving.map(e => e.getAttribute("class")?.split(" ")[0])).toEqual([
      "v-ng-node",
      "v-ng-node-label",
    ])
    leaving.forEach(e => expect(e.getAttribute("transform")).toBe("translate(100 0)"))
  })

  test("entering nodes and labels enter at their positions", async () => {
    addStyle(
      ".fade-enter-active { transition: opacity 1s linear; } .fade-enter-from { opacity: 0; }"
    )
    const configs = { node: { transition: "fade", label: { visible: true } } }
    const { screen, state } = await mountGraph({ nodes, layouts, configs })

    await addNode(state)
    const entering = [...screen.container.querySelectorAll(".fade-enter-active")]
    expect(entering).toHaveLength(2)
    entering.forEach(e => expect(e.getAttribute("transform")).toBe("translate(100 0)"))
  })
})

describe("transitionWhile", () => {
  test("nodes, labels and edges move gradually to their new positions", async () => {
    const { screen, state, graph } = await mountGraph({
      nodes: { node1: { name: "Node 1" }, node2: { name: "Node 2" } },
      edges: { edge1: { source: "node1", target: "node2" } },
      layouts: { nodes: { node1: { x: 0, y: 0 }, node2: { x: 100, y: 0 } } },
      configs: { node: { label: { visible: true } } },
    })
    const elements = [".v-ng-node", ".v-ng-node-label", ".v-ng-edge"].map(selector =>
      screen.container.querySelector(selector)!
    )
    // The left of the node and its label, and the length of the edge, all move by 100.
    const measure = () =>
      elements.map((e, i) => {
        const rect = e.getBoundingClientRect()
        return i < 2 ? -rect.x : rect.width
      })
    const start = measure()

    graph.transitionWhile(() => {
      state.layouts.nodes.node1.x = -100
    }, 1000)
    await wait(500)
    measure().forEach((value, i) => {
      expect(value - start[i]).toBeGreaterThan(10)
      expect(value - start[i]).toBeLessThan(90)
    })
    await wait(800)
    measure().forEach((value, i) => expect(value - start[i]).toBeCloseTo(100, 0))
  })
})
