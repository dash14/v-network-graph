import { describe, expect, test, vi } from "vitest"
import { render } from "vitest-browser-vue"
import { defineComponent, h, nextTick, reactive, ref } from "vue"
import { VNetworkGraph } from "@/index"
import type { Events, UserConfigs, VNetworkGraphInstance } from "@/index"
import type { LayoutHandler } from "@/layouts/handler"
import type { SvgPanZoomInstance } from "@/modules/svg-pan-zoom-ex"
import { HEIGHT, POLL_INTERVAL, WIDTH } from "./helpers/container"
import type { RecordedEvent } from "./helpers/graph"
import { payloadsOf } from "./helpers/graph"

const nodes = { node1: {}, node2: {} }
const edges = { edge1: { source: "node1", target: "node2" } }
const layouts = { nodes: { node1: { x: 100, y: 50 }, node2: { x: 200, y: 50 } } }

/** Renders a graph in a container of the given size, without waiting for it to load. */
async function renderGraph(
  configs: UserConfigs,
  { size = { width: WIDTH, height: HEIGHT }, graphNodes = nodes as Record<string, object> } = {}
) {
  const events: RecordedEvent[] = []
  const graph = ref<VNetworkGraphInstance>()
  const style = reactive({ width: `${size.width}px`, height: `${size.height}px` })
  const shown = ref(true)
  const state = reactive({ configs })
  const screen = await render(
    defineComponent(
      () => () =>
        h("div", { class: "container", style }, [
          shown.value &&
            h(VNetworkGraph, {
              ref: graph,
              nodes: graphNodes,
              edges,
              layouts: structuredClone(layouts),
              configs: state.configs,
              eventHandlers: { "*": (type, payload) => events.push({ type, payload }) },
            }),
        ])
    )
  )
  const loaded = () =>
    vi.waitUntil(() => events.some(e => e.type === "view:load"), {
      timeout: 5000,
      interval: POLL_INTERVAL,
    })
  return {
    screen,
    graph: () => graph.value!,
    events,
    style,
    state,
    loaded,
    unmount: async () => {
      shown.value = false
      await nextTick()
    },
  }
}

const has = (events: RecordedEvent[], type: keyof Events) => events.some(e => e.type === type)

describe("loading", () => {
  test("waits for onBeforeInitialDisplay to resolve", async () => {
    const before = Promise.withResolvers<void>()
    const { events, loaded } = await renderGraph({
      view: { onBeforeInitialDisplay: () => before.promise },
    })
    await new Promise(resolve => setTimeout(resolve, 100))
    expect(has(events, "view:load")).toBe(false)

    before.resolve()
    await loaded()
  })

  test("calls onBeforeInitialDisplay that returns no promise", async () => {
    const onBeforeInitialDisplay = vi.fn()
    const { loaded } = await renderGraph({ view: { onBeforeInitialDisplay } })
    await loaded()
    expect(onBeforeInitialDisplay).toHaveBeenCalledOnce()
  })

  test("leaves the view where it is with autoPanAndZoomOnLoad false", async () => {
    const { graph, events, loaded } = await renderGraph({ view: { autoPanAndZoomOnLoad: false } })
    await loaded()
    expect(graph().getPan()).toEqual({ x: 0, y: 0 })
    expect(payloadsOf(events, "view:pan")).toEqual([])
  })

  test("deactivates the layout handler replaced, and activates the new one", async () => {
    // Instances of a class, as the configs merge a plain object into the one it replaces.
    class Layout implements LayoutHandler {
      activate = vi.fn()
      deactivate = vi.fn()
    }
    const first = new Layout()
    const second = new Layout()
    const { state, loaded } = await renderGraph({ view: { layoutHandler: first } })
    await loaded()
    expect(first.activate).toHaveBeenCalledOnce()

    state.configs.view!.layoutHandler = second
    await nextTick()
    expect(first.deactivate).toHaveBeenCalledOnce()
    expect(second.activate).toHaveBeenCalledOnce()
  })
})

describe("unloading", () => {
  test("emits no zoom or pan after the unload, though svg-pan-zoom draws them on the next frame", async () => {
    const { graph, events, loaded, unmount } = await renderGraph({})
    await loaded()
    events.splice(0)

    graph().zoomIn()
    graph().panBy({ x: 10, y: 10 })
    await unmount()
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))

    const types = events.map(e => e.type)
    expect(types).toContain("view:unload")
    expect(types.slice(types.indexOf("view:unload") + 1)).toEqual([])
  })
})

describe("resizing", () => {
  test("keeps the view centered and emits the new size", async () => {
    const { graph, style, events, loaded } = await renderGraph({})
    await loaded()
    const pan = graph().getPan()

    style.width = `${WIDTH + 100}px`
    await expect.poll(() => payloadsOf(events, "view:resize")).toHaveLength(1)
    expect(payloadsOf(events, "view:resize")[0]).toMatchObject({
      width: WIDTH + 100,
      height: HEIGHT,
    })
    expect(graph().getPan()).toEqual({ x: pan.x + 50, y: pan.y })
  })

  test("draws the grid over the new size", async () => {
    const { screen, style, events, loaded } = await renderGraph({
      view: { grid: { visible: true } },
    })
    await loaded()
    const lines = () => screen.container.querySelectorAll(".v-ng-background-grid path").length
    const before = lines()

    style.width = `${WIDTH + 200}px`
    await expect.poll(() => payloadsOf(events, "view:resize")).toHaveLength(1)
    await expect.poll(lines).toBeGreaterThan(before)
  })

  test("leaves the view as it is with autoPanOnResize false", async () => {
    const { graph, style, events, loaded } = await renderGraph({
      view: { autoPanOnResize: false },
    })
    await loaded()
    const pan = graph().getPan()

    style.width = `${WIDTH + 100}px`
    await new Promise(resolve => setTimeout(resolve, 100))
    expect(payloadsOf(events, "view:resize")).toEqual([])
    expect(graph().getPan()).toEqual(pan)
  })
})

describe("view methods", () => {
  test("fitToContents centers the view with no nodes", async () => {
    const { graph, loaded } = await renderGraph({}, { graphNodes: {} })
    await loaded()
    graph().panTo({ x: 0, y: 0 })

    await graph().fitToContents()
    expect(graph().getPan()).toEqual({ x: WIDTH / 2, y: HEIGHT / 2 })
  })
})

describe("view mode", () => {
  test("a box selection keeps the pan and zoom disabled", async () => {
    let panZoom: SvgPanZoomInstance | undefined
    const { graph, events, loaded } = await renderGraph({
      view: {
        panEnabled: false,
        zoomEnabled: false,
        onSvgPanZoomInitialized: (i: SvgPanZoomInstance) => (panZoom = i),
      },
    })
    await loaded()

    graph().startBoxSelection({ stop: "manual" })
    await expect.poll(() => payloadsOf(events, "view:mode")).toEqual(["box-selection"])
    graph().stopBoxSelection()
    await expect.poll(() => payloadsOf(events, "view:mode")).toEqual(["box-selection", "default"])
    expect([panZoom!.isPanEnabled(), panZoom!.isZoomEnabled()]).toEqual([false, false])
  })
})

describe("touches", () => {
  // So that svg-pan-zoom, listening on the <svg>, does not pan with a touch on the graph.
  test("a touch on the viewport does not reach the <svg>", async () => {
    const { screen, loaded } = await renderGraph({})
    await loaded()
    const svg = screen.container.querySelector("svg.v-ng-canvas")!
    const reached = vi.fn()
    svg.addEventListener("touchstart", reached)

    screen.container
      .querySelector(".v-ng-viewport")!
      .dispatchEvent(new TouchEvent("touchstart", { bubbles: true }))
    expect(reached).not.toHaveBeenCalled()
  })
})
