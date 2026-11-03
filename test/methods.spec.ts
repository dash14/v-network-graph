import { describe, expect, onTestFinished, test, vi } from "vitest"
import { render } from "vitest-browser-vue"
import { defineComponent, h, reactive, ref } from "vue"
import { VNetworkGraph } from "@/index"
import type { VNetworkGraphInstance } from "@/index"
import type { SvgPanZoomInstance } from "@/modules/svg-pan-zoom-ex"
import { HEIGHT, WIDTH } from "./helpers/container"
import { at, drag, mountGraph, payloadsOf } from "./helpers/graph"

// Labels are hidden, since the fit follows their size, which depends on the fonts.
const configs = { node: { normal: { radius: 16 }, label: { visible: false } } }
const nodes = { node1: {}, node2: {}, node3: {} }
const edges = {
  edge1: { source: "node1", target: "node2" },
  edge2: { source: "node2", target: "node3" },
}
const layouts = {
  nodes: { node1: { x: -100, y: 0 }, node2: { x: 0, y: 0 }, node3: { x: 100, y: 0 } },
}
// Contents centered at (100, 50), away from the origin that the view starts centered on.
const offsetLayouts = {
  nodes: { node1: { x: 0, y: 50 }, node2: { x: 100, y: 50 }, node3: { x: 200, y: 50 } },
}

describe("pan", () => {
  test("the origin starts at the center of the container", async () => {
    const { graph } = await mountGraph({ nodes, edges, layouts, configs })

    expect(graph.getPan()).toEqual({ x: WIDTH / 2, y: HEIGHT / 2 })
    expect(graph.getSizes()).toMatchObject({ width: WIDTH, height: HEIGHT })
    expect(graph.getViewBox()).toEqual({ top: -200, bottom: 200, left: -300, right: 300 })
  })

  test("panTo and panBy move the view and emit the pan", async () => {
    const { graph, events } = await mountGraph({ nodes, edges, layouts, configs })

    graph.panTo({ x: 100, y: 50 })
    expect(graph.getPan()).toEqual({ x: 100, y: 50 })
    expect(graph.getViewBox()).toMatchObject({ left: -100, top: -50 })

    graph.panBy({ x: 10, y: -20 })
    expect(graph.getPan()).toEqual({ x: 110, y: 30 })
    expect(payloadsOf(events, "view:pan")).toEqual([
      { x: 100, y: 50 },
      { x: 110, y: 30 },
    ])
  })

  test("panToCenter centers the contents", async () => {
    const { graph } = await mountGraph({ nodes, edges, layouts: offsetLayouts, configs })

    await graph.panToCenter()
    const box = graph.getViewBox()
    expect((box.left + box.right) / 2).toBeCloseTo(100)
    expect((box.top + box.bottom) / 2).toBeCloseTo(50)
  })
})

describe("zoom", () => {
  test("zoomIn and zoomOut change the zoom level by a fixed factor", async () => {
    const { graph, state, events } = await mountGraph({
      nodes,
      edges,
      layouts,
      configs,
      zoomLevel: 1,
    })

    graph.zoomIn()
    await expect.poll(() => state.zoomLevel).toBeCloseTo(1.1, 5)
    graph.zoomOut()
    graph.zoomOut()
    await expect.poll(() => state.zoomLevel).toBeCloseTo(1 / 1.1, 5)
    expect(payloadsOf(events, "view:zoom")).toHaveLength(3)
  })

  test("the zoom level stays within the configured range", async () => {
    const { graph, state } = await mountGraph({
      nodes,
      edges,
      layouts,
      configs: { ...configs, view: { minZoomLevel: 0.95, maxZoomLevel: 1.05 } },
      zoomLevel: 1,
    })

    graph.zoomIn()
    await expect.poll(() => state.zoomLevel).toBeCloseTo(1.05, 5)
    graph.zoomOut()
    graph.zoomOut()
    await expect.poll(() => state.zoomLevel).toBeCloseTo(0.95, 5)
  })

  test("the zoom level moves into a range changed to leave it out", async () => {
    const { state } = await mountGraph({ nodes, edges, layouts, configs, zoomLevel: 1 })

    state.configs.view.minZoomLevel = 1.5
    state.configs.view.maxZoomLevel = 2
    await expect.poll(() => state.zoomLevel).toBeCloseTo(1.5, 5)
  })

  test("changing the zoomLevel prop zooms the view", async () => {
    const { graph, state } = await mountGraph({ nodes, edges, layouts, configs, zoomLevel: 1 })

    state.zoomLevel = 2
    await expect
      .poll(() => graph.getViewBox().right - graph.getViewBox().left)
      .toBeCloseTo(WIDTH / 2)
  })
})

describe("view box", () => {
  // Without edges, the edges layer is empty.
  test.each([
    { name: "with edges", edges },
    { name: "without edges", edges: {} },
  ])(
    "fitToContents zooms and pans so that the contents fill the container, $name",
    async ({ edges }) => {
      const { graph, state, events } = await mountGraph({
        nodes,
        edges,
        layouts: offsetLayouts,
        configs,
        zoomLevel: 1,
      })

      await graph.fitToContents({ margin: 0 })
      // The node radius does not scale with the zoom, so it adds 16px on each side.
      expect(Math.abs(state.zoomLevel * 200 + 32 - WIDTH)).toBeLessThan(1)
      const box = graph.getViewBox()
      expect((box.left + box.right) / 2).toBeCloseTo(100)
      expect((box.top + box.bottom) / 2).toBeCloseTo(50)
      expect(payloadsOf(events, "view:fit")).toHaveLength(1)
    }
  )

  test("setViewBox shows the box, widened to the aspect ratio of the container", async () => {
    const { graph } = await mountGraph({ nodes, edges, layouts, configs })

    graph.setViewBox({ top: -50, bottom: 50, left: -50, right: 50 })
    const box = graph.getViewBox()
    expect(box.top).toBeCloseTo(-50)
    expect(box.bottom).toBeCloseTo(50)
    expect(box.left).toBeCloseTo(-75)
    expect(box.right).toBeCloseTo(75)
  })

  test("setViewBox shows a wide box, heightened to the aspect ratio of the container", async () => {
    const { graph } = await mountGraph({ nodes, edges, layouts, configs })

    graph.setViewBox({ top: -50, bottom: 50, left: -200, right: 200 })
    const box = graph.getViewBox()
    expect(box.left).toBeCloseTo(-200)
    expect(box.right).toBeCloseTo(200)
    expect(box.top).toBeCloseTo(-400 / 3)
    expect(box.bottom).toBeCloseTo(400 / 3)
  })

  test("setViewBox shows a tall box, widened to the aspect ratio of the container", async () => {
    const { graph } = await mountGraph({ nodes, edges, layouts, configs })

    graph.setViewBox({ top: -100, bottom: 100, left: -50, right: 50 })
    const box = graph.getViewBox()
    expect(box.top).toBeCloseTo(-100)
    expect(box.bottom).toBeCloseTo(100)
    expect(box.left).toBeCloseTo(-150)
    expect(box.right).toBeCloseTo(150)
  })

  test("panEnabled and zoomEnabled switch svg-pan-zoom after mounting", async () => {
    let panZoom: SvgPanZoomInstance | undefined
    const { state } = await mountGraph({
      nodes,
      edges,
      layouts,
      configs: {
        ...configs,
        view: { onSvgPanZoomInitialized: (i: SvgPanZoomInstance) => (panZoom = i) },
      },
    })
    await expect.poll(() => panZoom).toBeDefined()
    expect(panZoom!.isPanEnabled()).toBe(true)
    expect(panZoom!.isZoomEnabled()).toBe(true)

    state.configs.view.panEnabled = false
    state.configs.view.zoomEnabled = false
    await expect
      .poll(() => [panZoom!.isPanEnabled(), panZoom!.isZoomEnabled()])
      .toEqual([false, false])
    expect(panZoom!.isDblClickZoomEnabled()).toBe(false)

    state.configs.view.panEnabled = true
    state.configs.view.zoomEnabled = true
    await expect
      .poll(() => [panZoom!.isPanEnabled(), panZoom!.isZoomEnabled()])
      .toEqual([true, true])
    expect(panZoom!.isDblClickZoomEnabled()).toBe(true)
  })

  test("panEnabled and zoomEnabled changed while the container has no size apply once it has", async () => {
    let panZoom: SvgPanZoomInstance | undefined
    const style = reactive({ width: "0px", height: "0px" })
    const view = reactive({
      onSvgPanZoomInitialized: (i: SvgPanZoomInstance) => (panZoom = i),
      panEnabled: true,
      zoomEnabled: true,
    })
    const graph = ref<VNetworkGraphInstance>()
    await render(
      defineComponent(
        () => () =>
          h("div", { style }, [
            h(VNetworkGraph, { ref: graph, nodes, edges, layouts, configs: { view } }),
          ])
      )
    )
    // svg-pan-zoom waits for the container to get a size.
    expect(graph.value!.getViewBox()).toEqual({ top: 0, bottom: 0, left: 0, right: 0 })
    view.panEnabled = false
    view.zoomEnabled = false
    await new Promise(resolve => setTimeout(resolve, 300))
    expect(panZoom).toBeUndefined()

    style.width = `${WIDTH}px`
    style.height = `${HEIGHT}px`
    await expect.poll(() => panZoom, { timeout: 5000 }).toBeDefined()
    expect([panZoom!.isPanEnabled(), panZoom!.isZoomEnabled()]).toEqual([false, false])
    expect(panZoom!.isDblClickZoomEnabled()).toBe(false)
  })

  test("coordinates translate between the DOM and the SVG both ways", async () => {
    const { graph, state } = await mountGraph({ nodes, edges, layouts, configs, zoomLevel: 1 })

    state.zoomLevel = 2
    await expect
      .poll(() => graph.translateFromSvgToDomCoordinates({ x: 10, y: 10 }).x)
      .toBeCloseTo(WIDTH / 2 + 20)
    expect(graph.translateFromSvgToDomCoordinates({ x: 10, y: 10 }).y).toBeCloseTo(HEIGHT / 2 + 20)
    const svg = graph.translateFromDomToSvgCoordinates({ x: WIDTH / 2 + 20, y: HEIGHT / 2 + 20 })
    expect(svg.x).toBeCloseTo(10)
    expect(svg.y).toBeCloseTo(10)
  })
})

describe("box selection mode", () => {
  test("stopBoxSelection ends the mode", async () => {
    const { graph, events } = await mountGraph({ nodes, edges, layouts, configs })

    graph.startBoxSelection({ stop: "manual" })
    await expect.poll(() => payloadsOf(events, "view:mode")).toEqual(["box-selection"])
    graph.stopBoxSelection()
    await expect.poll(() => payloadsOf(events, "view:mode")).toEqual(["box-selection", "default"])
  })
})

describe("box selection", () => {
  test("selects the nodes without a valid position where they are drawn, at the origin", async () => {
    const { graph, canvas, state, events } = await mountGraph({
      nodes,
      edges,
      layouts: { nodes: { node1: { x: -100, y: 0 }, node2: { x: NaN, y: NaN } } },
      // A handler that does not give the nodes new positions.
      configs: {
        node: { ...configs.node, selectable: true },
        view: { layoutHandler: { activate() {}, deactivate() {} } },
      },
    })

    graph.startBoxSelection()
    await expect.poll(() => payloadsOf(events, "view:mode")).toEqual(["box-selection"])
    await drag(canvas, at(-20, -20), at(20, 20))

    await expect.poll(() => [...state.selectedNodes].sort()).toEqual(["node2", "node3"])
  })
})

describe("export", () => {
  test("exportAsSvgText fits the contents with a margin and leaves out the view's state", async () => {
    const { screen, graph } = await mountGraph({ nodes, edges, layouts, configs })
    expect(screen.container.querySelector("svg")!.innerHTML).toContain("<!--")

    const text = await graph.exportAsSvgText()
    const svg = new DOMParser().parseFromString(text, "image/svg+xml").documentElement

    expect(svg.getAttribute("width")).toBe("252")
    expect(svg.getAttribute("height")).toBe("52")
    expect(svg.getAttribute("viewBox")).toBe("0 0 252 52")
    expect(svg.hasAttribute("style")).toBe(false)
    const viewport = svg.querySelector(".v-ng-viewport")!
    expect(viewport.getAttribute("transform")).toBe("translate(126 26), scale(1)")
    expect(viewport.hasAttribute("style")).toBe(false)
    expect(text).not.toContain("<!--")
  })

  test("exportAsSvgText leaves out that the positions are changing", async () => {
    const { screen, graph, state } = await mountGraph({ nodes, edges, layouts, configs })
    const viewport = screen.container.querySelector(".v-ng-viewport")!
    for (let x = 10; x <= 50; x += 10) {
      state.layouts.nodes.node1.x = x
      await new Promise(resolve => requestAnimationFrame(resolve))
    }
    expect(viewport.hasAttribute("data-moving")).toBe(true)

    const text = await graph.exportAsSvgText()

    expect(text).not.toContain("data-moving")
  })

  test.each([
    {
      scalingObjects: false,
      width: "472",
      height: "72",
      transform: "translate(236 36), scale(2)",
    },
    {
      scalingObjects: true,
      width: "252",
      height: "52",
      transform: "translate(126 26), scale(1)",
    },
  ])(
    "a zoomed graph keeps its proportions as shown, scalingObjects: $scalingObjects",
    async ({ scalingObjects, width, height, transform }) => {
      const { graph } = await mountGraph({
        nodes,
        edges,
        layouts,
        zoomLevel: 2,
        configs: { ...configs, view: { scalingObjects } },
      })

      const svg = await graph.exportAsSvgElement()

      expect(svg.getAttribute("width")).toBe(width)
      expect(svg.getAttribute("height")).toBe(height)
      expect(svg.getAttribute("viewBox")).toBe(`0 0 ${width} ${height}`)
      expect(svg.querySelector(".v-ng-viewport")!.getAttribute("transform")).toBe(transform)
    }
  )

  test("embedImages replaces the image URLs with data URLs, keeping those that fail", async () => {
    const { screen, graph } = await mountGraph({ nodes, edges, layouts, configs })
    const blob = new Blob(['<svg xmlns="http://www.w3.org/2000/svg" />'], { type: "image/svg+xml" })
    const url = URL.createObjectURL(blob)
    onTestFinished(() => URL.revokeObjectURL(url))
    const unreachable = URL.createObjectURL(blob)
    URL.revokeObjectURL(unreachable)
    const notFound = "/no-such-image.svg"
    const viewport = screen.container.querySelector(".v-ng-viewport")!
    for (const href of [url, unreachable, notFound]) {
      const image = document.createElementNS("http://www.w3.org/2000/svg", "image")
      image.setAttribute("href", href)
      viewport.appendChild(image)
    }
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    onTestFinished(() => warn.mockRestore())

    const hrefs = async (embedImages: boolean) => {
      const svg = await graph.exportAsSvgElement({ embedImages })
      return Array.from(svg.querySelectorAll("image"), image => image.getAttribute("href"))
    }

    expect(await hrefs(false)).toEqual([url, unreachable, notFound])
    expect(await hrefs(true)).toEqual([
      expect.stringMatching(/^data:image\/svg\+xml;base64,/),
      unreachable,
      notFound,
    ])
    expect(warn).toHaveBeenCalledWith("Image download failed.", unreachable)
    expect(warn).toHaveBeenCalledWith("Image download failed.", notFound)
  })

  test("embedImages reads xlink:href and leaves data URLs and images without one as they are", async () => {
    const { screen, graph } = await mountGraph({ nodes, edges, layouts, configs })
    const blob = new Blob(['<svg xmlns="http://www.w3.org/2000/svg" />'], { type: "image/svg+xml" })
    const url = URL.createObjectURL(blob)
    onTestFinished(() => URL.revokeObjectURL(url))
    // Not base64, so that reading it again would change it.
    const dataUrl = "data:image/svg+xml,%3Csvg%2F%3E"
    const viewport = screen.container.querySelector(".v-ng-viewport")!
    const addImage = (attribute?: string, href?: string) => {
      const image = document.createElementNS("http://www.w3.org/2000/svg", "image")
      if (attribute && href) image.setAttribute(attribute, href)
      viewport.appendChild(image)
    }
    addImage("xlink:href", url)
    addImage("href", dataUrl)
    addImage()
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    onTestFinished(() => warn.mockRestore())

    const svg = await graph.exportAsSvgElement({ embedImages: true })
    const images = Array.from(svg.querySelectorAll("image"), image => [
      image.getAttribute("href"),
      image.getAttribute("xlink:href"),
    ])
    expect(images).toEqual([
      [null, expect.stringMatching(/^data:image\/svg\+xml;base64,/)],
      [dataUrl, null],
      [null, null],
    ])
    expect(warn).not.toHaveBeenCalled()
  })
})

describe("svg-pan-zoom instance", () => {
  async function mountWithInstance() {
    let panZoom: SvgPanZoomInstance | undefined
    const mounted = await mountGraph({
      nodes,
      edges,
      layouts,
      configs: {
        ...configs,
        view: { onSvgPanZoomInitialized: (i: SvgPanZoomInstance) => (panZoom = i) },
      },
    })
    await expect.poll(() => panZoom).toBeDefined()
    return { ...mounted, panZoom: panZoom! }
  }

  test("disablePan stops a drag on the background from panning, and enablePan lets it", async () => {
    const { graph, canvas, panZoom } = await mountWithInstance()
    const svg = canvas.element()
    const rect = svg.getBoundingClientRect()
    const drag = () => {
      const pointer = (type: string, x: number, y: number) =>
        svg.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            cancelable: true,
            pointerType: "mouse",
            clientX: rect.left + x,
            clientY: rect.top + y,
          })
        )
      pointer("pointerdown", 300, 300)
      pointer("pointermove", 350, 350)
      pointer("pointerup", 350, 350)
    }
    // Two presses in a row at one place would zoom as a double click.
    panZoom.disableDblClickZoom()
    const start = graph.getPan()

    panZoom.disablePan()
    drag()
    expect(graph.getPan()).toEqual(start)

    panZoom.enablePan()
    drag()
    expect(graph.getPan()).toEqual({ x: start.x + 50, y: start.y + 50 })
  })

  test("disableZoom stops the wheel from zooming, and enableZoom lets it", async () => {
    const { canvas, panZoom } = await mountWithInstance()
    const wheel = () =>
      canvas
        .element()
        .dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: 1 }))
    const start = panZoom.getZoom()

    panZoom.disableZoom()
    wheel()
    expect(panZoom.getZoom()).toBe(start)

    panZoom.enableZoom()
    wheel()
    expect(panZoom.getZoom()).not.toBe(start)
  })

  test("setZoomEnabled switches the double click zoom with the zoom", async () => {
    const { panZoom } = await mountWithInstance()

    panZoom.setZoomEnabled(false)
    expect(panZoom.isDblClickZoomEnabled()).toBe(false)
    panZoom.setZoomEnabled(true)
    expect(panZoom.isDblClickZoomEnabled()).toBe(true)
  })
})

describe("a view fitted to the contents on load", () => {
  // svg-pan-zoom then zooms relative to the fitted zoom, not to 1.
  async function mountFitted(view: { minZoomLevel?: number; maxZoomLevel?: number } = {}) {
    let panZoom: SvgPanZoomInstance | undefined
    const graph = ref<VNetworkGraphInstance>()
    const zoomLevel = ref(1)
    const screen = await render(
      defineComponent(
        () => () =>
          h("div", { style: { width: `${WIDTH}px`, height: `${HEIGHT}px` } }, [
            h(VNetworkGraph, {
              ref: graph,
              nodes,
              edges,
              layouts: offsetLayouts,
              zoomLevel: zoomLevel.value,
              "onUpdate:zoomLevel": (v: number) => (zoomLevel.value = v),
              configs: {
                ...configs,
                view: {
                  ...view,
                  autoPanAndZoomOnLoad: "fit-content",
                  onSvgPanZoomInitialized: (i: SvgPanZoomInstance) => (panZoom = i),
                },
              },
            }),
          ])
      )
    )
    onTestFinished(() => screen.unmount())
    await expect.poll(() => panZoom).toBeDefined()
    await expect.poll(() => panZoom!.getRealZoom() / panZoom!.getZoom()).not.toBeCloseTo(1)
    return { graph: graph.value!, panZoom: panZoom! }
  }

  test("setViewBox shows a box off the origin", async () => {
    const { graph } = await mountFitted()

    graph.setViewBox({ top: 0, bottom: 100, left: 100, right: 300 })
    const box = graph.getViewBox()
    expect(box.left).toBeCloseTo(100)
    expect(box.right).toBeCloseTo(300)
    expect(box.top).toBeCloseTo(50 - 200 / 3)
    expect(box.bottom).toBeCloseTo(50 + 200 / 3)
  })

  test("the view zooms only within the configured range", async () => {
    const { graph, panZoom } = await mountFitted({ minZoomLevel: 0.5, maxZoomLevel: 4 })

    // The zoomLevel prop is clamped on its own, so the zoom of the view itself is checked.
    for (let i = 0; i < 30; i++) graph.zoomIn()
    await expect.poll(() => panZoom.getRealZoom()).toBeCloseTo(4, 5)
    for (let i = 0; i < 60; i++) graph.zoomOut()
    await expect.poll(() => panZoom.getRealZoom()).toBeCloseTo(0.5, 5)
  })
})
