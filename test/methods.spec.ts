import { describe, expect, onTestFinished, test, vi } from "vitest"
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
})
