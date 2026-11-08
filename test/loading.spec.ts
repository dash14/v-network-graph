import { describe, expect, onTestFinished, test, vi } from "vitest"
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
  {
    size = { width: WIDTH, height: HEIGHT },
    graphNodes = nodes as Record<string, object>,
    positions = layouts.nodes as Record<string, { x: number; y: number }>,
  } = {}
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
              layouts: structuredClone({ nodes: positions }),
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

  test.each([
    // svg-pan-zoom centers the contents first, which leaves the pan where the graph puts it.
    ["the pan did not change", { node1: { x: -100, y: 0 }, node2: { x: 100, y: 0 } }],
    ["the pan changed", { node1: { x: 100, y: 50 }, node2: { x: 200, y: 50 } }],
    ["only the vertical pan changed", { node1: { x: -100, y: 50 }, node2: { x: 100, y: 50 } }],
  ])("tells the pan once on load when %s", async (_, positions) => {
    const { events, loaded } = await renderGraph(
      { view: { autoPanAndZoomOnLoad: "center-zero" } },
      { positions }
    )
    await loaded()
    await nextTick()
    expect(payloadsOf(events, "view:pan")).toEqual([{ x: WIDTH / 2, y: HEIGHT / 2 }])
  })

  test.each(["width", "height"] as const)(
    "waits for the container to get a %s before loading",
    async side => {
      const size = { width: WIDTH, height: HEIGHT, [side]: 0 }
      const { style, events, loaded } = await renderGraph({}, { size })
      await new Promise(resolve => setTimeout(resolve, 300))
      expect(has(events, "view:load")).toBe(false)

      style[side] = `${side === "width" ? WIDTH : HEIGHT}px`
      await loaded()
    }
  )

  test("deactivates the layout handler on unload", async () => {
    const layoutHandler = { activate: vi.fn(), deactivate: vi.fn() }
    const { loaded, unmount } = await renderGraph({ view: { layoutHandler } })
    await loaded()
    await unmount()
    expect(layoutHandler.deactivate).toHaveBeenCalledOnce()
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

  test("keeps the view centered as the height changes, from the size before each change", async () => {
    let panZoom: SvgPanZoomInstance | undefined
    const { graph, style, events, loaded } = await renderGraph({
      view: { onSvgPanZoomInitialized: (i: SvgPanZoomInstance) => (panZoom = i) },
    })
    await loaded()
    const pan = graph().getPan()

    style.height = `${HEIGHT + 100}px`
    await expect.poll(() => payloadsOf(events, "view:resize")).toHaveLength(1)
    expect(graph().getPan()).toEqual({ x: pan.x, y: pan.y + 50 })
    expect(panZoom!.getSizes().height).toBe(HEIGHT + 100)

    style.height = `${HEIGHT + 300}px`
    await expect.poll(() => payloadsOf(events, "view:resize")).toHaveLength(2)
    expect(payloadsOf(events, "view:resize")[1]).toMatchObject({ height: HEIGHT + 300 })
    expect(graph().getPan()).toEqual({ x: pan.x, y: pan.y + 150 })
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

  test("reports the resize but leaves the pan as it is with autoPanOnResize false", async () => {
    const { graph, style, events, loaded } = await renderGraph({
      view: { autoPanOnResize: false },
    })
    await loaded()
    const pan = graph().getPan()

    style.width = `${WIDTH + 100}px`
    await expect.poll(() => payloadsOf(events, "view:resize")).toHaveLength(1)
    expect(payloadsOf(events, "view:resize")[0]).toMatchObject({ width: WIDTH + 100 })
    expect(graph().getPan()).toEqual(pan)
  })

  test("pans from the size of the last resize once autoPanOnResize is turned on", async () => {
    const { graph, style, state, events, loaded } = await renderGraph({
      view: { autoPanOnResize: false },
    })
    await loaded()
    const pan = graph().getPan()

    style.width = `${WIDTH + 100}px`
    await expect.poll(() => payloadsOf(events, "view:resize")).toHaveLength(1)
    state.configs.view!.autoPanOnResize = true
    style.width = `${WIDTH + 300}px`
    await expect.poll(() => payloadsOf(events, "view:resize")).toHaveLength(2)
    expect(graph().getPan()).toEqual({ x: pan.x + 100, y: pan.y })
  })

  test("draws the grid over the new size with autoPanOnResize false", async () => {
    const { screen, style, events, loaded } = await renderGraph({
      view: { autoPanOnResize: false, grid: { visible: true } },
    })
    await loaded()
    const lines = () => screen.container.querySelectorAll(".v-ng-background-grid path").length
    const before = lines()

    style.width = `${WIDTH + 200}px`
    await expect.poll(() => payloadsOf(events, "view:resize")).toHaveLength(1)
    await expect.poll(lines).toBeGreaterThan(before)
  })
})

describe("without ResizeObserver", () => {
  // Server-side rendering and jsdom have none.
  test("a graph loads, and follows no resize", async () => {
    vi.stubGlobal("ResizeObserver", undefined)
    onTestFinished(() => {
      vi.unstubAllGlobals()
    })
    const { style, events, loaded, unmount } = await renderGraph({})
    await loaded()

    style.width = `${WIDTH + 100}px`
    await new Promise(resolve => setTimeout(resolve, 100))
    expect(payloadsOf(events, "view:resize")).toEqual([])
    await unmount()
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
