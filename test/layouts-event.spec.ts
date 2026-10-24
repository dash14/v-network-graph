import { describe, expect, test, vi } from "vitest"
import { render } from "vitest-browser-vue"
import { defineComponent, h, nextTick, reactive, ref } from "vue"
import { Layouts, VNetworkGraph } from "@/index"

const nodes = {
  node1: { name: "Node 1" },
  node2: { name: "Node 2" },
}

type Listeners = Record<string, ((v: Layouts) => void) | ((v: Layouts) => void)[]>

/** Mounts a graph whose reads of node1's x are counted, to see whether the layouts are walked. */
async function mountCounting(initial: Listeners) {
  let reads = 0
  let x = 0
  const node1 = {
    get x() {
      reads++
      return x
    },
    set x(v) {
      x = v
    },
    y: 0,
  }
  const layouts = reactive({ nodes: { node1, node2: { x: 100, y: 0 } } })
  const listeners = ref(initial)
  let resolveLoaded: () => void
  const loaded = new Promise<void>(resolve => (resolveLoaded = resolve))
  // The same object on every render, so that only the listeners change between renders.
  const eventHandlers = { "view:load": () => resolveLoaded() }
  const screen = await render(
    defineComponent(
      () => () =>
        h("div", { style: { width: "400px", height: "300px" } }, [
          h(VNetworkGraph, {
            nodes,
            layouts,
            eventHandlers,
            ...listeners.value,
          }),
        ])
    )
  )
  await loaded

  /** Moves node2 and returns how many times node1's x was read meanwhile. */
  const moveNode2 = async () => {
    reads = 0
    layouts.nodes.node2.x += 10
    await nextTick()
    await nextTick()
    return reads
  }
  const setListeners = async (v: Listeners) => {
    listeners.value = v
    await nextTick()
  }
  return { screen, layouts, moveNode2, setListeners }
}

describe("update:layouts", () => {
  test("is emitted to every handler given as an array without a prop warning", async () => {
    const warn = vi.spyOn(console, "warn")
    const first = vi.fn()
    const second = vi.fn()
    const { moveNode2 } = await mountCounting({ "onUpdate:layouts": [first, second] })

    await moveNode2()
    expect(first).toHaveBeenCalled()
    expect(second).toHaveBeenCalled()
    expect(warn.mock.calls.flat().join(" ")).not.toContain("Invalid prop")
    warn.mockRestore()
  })

  test("is emitted only for position changes when the listener function is replaced", async () => {
    const listener = vi.fn()
    const { moveNode2, setListeners } = await mountCounting({})

    await setListeners({ "onUpdate:layouts": v => listener(v) })
    await setListeners({ "onUpdate:layouts": v => listener(v) })
    await nextTick()
    expect(listener).not.toHaveBeenCalled()

    await moveNode2()
    expect(listener).toHaveBeenCalledTimes(1)
  })

  test("is emitted once per change to both a listener and a once listener", async () => {
    const listener = vi.fn()
    const once = vi.fn()
    const { moveNode2 } = await mountCounting({
      "onUpdate:layouts": listener,
      "onUpdate:layoutsOnce": once,
    })

    await moveNode2()
    expect(listener).toHaveBeenCalledTimes(1)
    expect(once).toHaveBeenCalledTimes(1)
  })

  test("is emitted to a listener given as a new value of a key already passed", async () => {
    const listener = vi.fn()
    const { moveNode2, setListeners } = await mountCounting({ "onUpdate:layouts": undefined! })

    await setListeners({ "onUpdate:layouts": listener })
    await moveNode2()
    expect(listener).toHaveBeenCalled()
  })

  test("reads no more positions while a listener is given", async () => {
    const { moveNode2, setListeners } = await mountCounting({})
    const unwatched = await moveNode2()

    await setListeners({ "onUpdate:layouts": () => {} })
    expect(await moveNode2()).toBe(unwatched)

    await setListeners({})
    expect(await moveNode2()).toBe(unwatched)
  })

  test("reads each position once per move with a listener", async () => {
    const { moveNode2 } = await mountCounting({ "onUpdate:layouts": () => {} })
    // node1 is read once as the positions are compared with the drawn ones, and not walked again.
    expect(await moveNode2()).toBe(1)
  })

  test("reads each position once per move after a once listener received the layouts", async () => {
    const listener = vi.fn()
    const { moveNode2 } = await mountCounting({ "onUpdate:layoutsOnce": listener })
    await moveNode2()
    expect(listener).toHaveBeenCalledTimes(1)
    expect(await moveNode2()).toBe(1)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  test("reads each position once per move for an empty array of handlers", async () => {
    const { moveNode2 } = await mountCounting({ "onUpdate:layouts": [] })
    expect(await moveNode2()).toBe(1)
  })

  test("stays done, as Vue does, when a once listener is removed and another one is added", async () => {
    const first = vi.fn()
    const second = vi.fn()
    const { moveNode2, setListeners } = await mountCounting({ "onUpdate:layoutsOnce": first })
    await moveNode2()
    await setListeners({})
    await setListeners({ "onUpdate:layoutsOnce": second })

    expect(await moveNode2()).toBe(1)
    expect(first).toHaveBeenCalledTimes(1)
    expect(second).not.toHaveBeenCalled()
  })

  test("is emitted when a coordinate changes to one drawn at the same place", async () => {
    const listener = vi.fn()
    const { layouts } = await mountCounting({ "onUpdate:layouts": listener })

    Object.assign(layouts.nodes.node2, { x: "100" })
    await nextTick()
    expect(listener).toHaveBeenCalledTimes(1)
  })

  test("is emitted when a position is fixed without moving", async () => {
    const listener = vi.fn()
    const { layouts } = await mountCounting({ "onUpdate:layouts": listener })

    Object.assign(layouts.nodes.node2, { fixed: true })
    await nextTick()
    expect(listener).toHaveBeenCalledTimes(1)
  })

  test("is emitted when a position is added or removed", async () => {
    const listener = vi.fn()
    const { layouts } = await mountCounting({ "onUpdate:layouts": listener })

    Object.assign(layouts.nodes, { node3: { x: 0, y: 50 } })
    await nextTick()
    expect(listener).toHaveBeenCalledTimes(1)
  })

  test("stops walking the layouts on unmount after a listener was added", async () => {
    const { screen, moveNode2, setListeners } = await mountCounting({})
    await setListeners({ "onUpdate:layouts": () => {} })

    screen.unmount()
    expect(await moveNode2()).toBe(0)
  })
})

describe("reactive layouts", () => {
  test("a node follows its position object replaced in the given layouts", async () => {
    const { screen, layouts } = await mountCounting({})

    layouts.nodes.node2 = { x: 150, y: 20 }
    await nextTick()
    const node2 = screen.container.querySelectorAll(".v-ng-node")[1]
    expect(node2.getAttribute("transform")).toBe("translate(150 20)")

    layouts.nodes.node2.y = 40
    await nextTick()
    expect(node2.getAttribute("transform")).toBe("translate(150 40)")
  })
})
