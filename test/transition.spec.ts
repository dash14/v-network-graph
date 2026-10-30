import { afterEach, describe, expect, onTestFinished, test, vi } from "vitest"
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

  test("a node added again while its old one leaves is drawn at its new position", async () => {
    addStyle(".fade-leave-active { transition: opacity 1s linear; } .fade-leave-to { opacity: 0; }")
    const configs = { node: { transition: "fade", label: { visible: true } } }
    const { screen, state } = await mountGraph({ nodes, layouts, configs })
    await addNode(state)

    delete state.nodes.node2
    await nextTick()
    state.nodes.node2 = { name: "Node 2" }
    state.layouts.nodes.node2 = { x: 0, y: 100 }
    await nextTick()

    // Vue finishes the leave of the old one at once, as its key enters again.
    expect(screen.container.querySelectorAll(".fade-leave-active")).toHaveLength(0)
    const transforms = (selector: string) =>
      [...screen.container.querySelectorAll(selector)].map(e => e.getAttribute("transform"))
    expect(transforms(".v-ng-node")).toEqual(["translate(0 0)", "translate(0 100)"])
    expect(transforms(".v-ng-node-label")).toEqual(["translate(0 0)", "translate(0 100)"])
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

  test("leaves the class of the viewport as it was once done", async () => {
    const { screen, graph } = await mountGraph({ nodes, layouts })
    const viewport = screen.container.querySelector(".v-ng-viewport")!
    const before = viewport.getAttribute("class")

    graph.transitionWhile(() => {}, 50)
    await nextTick()
    expect(viewport.classList.contains("v-ng-transition")).toBe(true)
    await expect.poll(() => viewport.getAttribute("class")).toBe(before)
    expect(viewport.classList).not.toContain("svg-pan-zoom_viewport")
  })

  test.each([
    {
      failure: "throws",
      func: () => {
        throw new Error("failed")
      },
    },
    { failure: "rejects", func: () => Promise.reject(new Error("failed")) },
  ])("the transition ends even if the function $failure", async ({ func }) => {
    const { screen, graph } = await mountGraph({ nodes, layouts })
    const viewport = screen.container.querySelector(".v-ng-viewport")!
    const errors: unknown[] = []
    const onRejection = (event: PromiseRejectionEvent) => {
      event.preventDefault()
      errors.push(event.reason)
    }
    window.addEventListener("unhandledrejection", onRejection)
    onTestFinished(() => window.removeEventListener("unhandledrejection", onRejection))

    graph.transitionWhile(func, 50)
    await nextTick()
    expect(viewport.classList.contains("v-ng-transition")).toBe(true)
    await expect.poll(() => viewport.classList.contains("v-ng-transition")).toBe(false)
    // The error still reaches the page as an unhandled rejection.
    await expect.poll(() => errors).toEqual([new Error("failed")])
  })

  test("an earlier call finishing later does not cut a later call short", async () => {
    const { screen, graph } = await mountGraph({ nodes, layouts })
    const viewport = screen.container.querySelector(".v-ng-viewport")!
    const earlier = Promise.withResolvers<void>()

    graph.transitionWhile(() => earlier.promise, 50)
    graph.transitionWhile(() => {}, 500)
    await nextTick()
    earlier.resolve()
    await wait(200)
    expect(viewport.classList.contains("v-ng-transition")).toBe(true)
    await expect.poll(() => viewport.classList.contains("v-ng-transition")).toBe(false)
  })

  test("a shorter later call does not cut an earlier call's animation short", async () => {
    const { screen, graph } = await mountGraph({ nodes, layouts })
    const viewport = screen.container.querySelector(".v-ng-viewport")!
    const earlier = Promise.withResolvers<void>()

    graph.transitionWhile(() => earlier.promise, 500)
    graph.transitionWhile(() => {}, 50)
    await nextTick()
    earlier.resolve()
    await wait(200)
    expect(viewport.classList.contains("v-ng-transition")).toBe(true)
    await expect.poll(() => viewport.classList.contains("v-ng-transition")).toBe(false)
  })

  test("the transition lasts until a later call that takes longer finishes", async () => {
    const { screen, graph } = await mountGraph({ nodes, layouts })
    const viewport = screen.container.querySelector(".v-ng-viewport")!
    const later = Promise.withResolvers<void>()

    graph.transitionWhile(() => {}, 50)
    graph.transitionWhile(() => later.promise, 50)
    await wait(200)
    expect(viewport.classList.contains("v-ng-transition")).toBe(true)
    later.resolve()
    await expect.poll(() => viewport.classList.contains("v-ng-transition")).toBe(false)
  })
})
