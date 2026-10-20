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
  const screen = await render(
    defineComponent(
      () => () =>
        h("div", { style: { width: "400px", height: "300px" } }, [
          h(VNetworkGraph, {
            nodes,
            layouts,
            eventHandlers: { "view:load": () => resolveLoaded() },
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
  return { screen, moveNode2, setListeners }
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

  test("is not emitted when only the listener function is replaced", async () => {
    const listener = vi.fn()
    const { setListeners } = await mountCounting({})

    await setListeners({ "onUpdate:layouts": v => listener(v) })
    await setListeners({ "onUpdate:layouts": v => listener(v) })
    await nextTick()
    expect(listener).not.toHaveBeenCalled()
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

  test("walks the layouts only while a listener is given", async () => {
    const { moveNode2, setListeners } = await mountCounting({})
    const unwatched = await moveNode2()

    await setListeners({ "onUpdate:layouts": () => {} })
    expect(await moveNode2()).toBeGreaterThan(unwatched)

    await setListeners({})
    expect(await moveNode2()).toBe(unwatched)
  })

  test("stops walking the layouts once a listener with the once modifier received them", async () => {
    const { moveNode2: moveUnwatched } = await mountCounting({})
    const unwatched = await moveUnwatched()

    const listener = vi.fn()
    const { moveNode2 } = await mountCounting({ "onUpdate:layoutsOnce": listener })
    await moveNode2()
    expect(listener).toHaveBeenCalledTimes(1)
    expect(await moveNode2()).toBe(unwatched)
  })

  test("stops walking the layouts on unmount after a listener was added", async () => {
    const { screen, moveNode2, setListeners } = await mountCounting({})
    await setListeners({ "onUpdate:layouts": () => {} })

    screen.unmount()
    expect(await moveNode2()).toBe(0)
  })
})
