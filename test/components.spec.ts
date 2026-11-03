import { describe, expect, test } from "vitest"
import { render } from "vitest-browser-vue"
import { page, userEvent } from "vitest/browser"
import { h, nextTick } from "vue"
import { VEdgeLabel, VLabelText, VStyle } from "@/index"
import type { UserConfigs } from "@/index"
import type { GraphProps } from "./helpers/graph"
import { at, mountGraph, payloadsOf } from "./helpers/graph"

const graph = (configs: UserConfigs = {}): GraphProps => ({
  nodes: { node1: { name: "Node 1" }, node2: { name: "Node 2" } },
  edges: { edge1: { source: "node1", target: "node2" } },
  layouts: { nodes: { node1: { x: -100, y: 0 }, node2: { x: 100, y: 0 } } },
  configs,
})

describe("layers", () => {
  test.each([false, true])(
    "draws the slots of the layers where they belong (lite: %s)",
    async lite => {
      const props = graph()
      props.layers = { back: "background", lines: "grid", base: "base", front: "nodes" }
      const slots = Object.fromEntries(
        Object.keys(props.layers).map(name => [name, () => h("rect", { class: name })])
      )
      const { screen } = await mountGraph(props, { lite, slots })
      const parentOf = (name: string) =>
        screen.container.querySelector(`rect.${name}`)?.closest("g.v-ng-layer")?.parentElement

      expect(parentOf("back")?.classList).toContain("v-ng-background-viewport")
      expect(parentOf("lines")?.classList).toContain("v-ng-background-viewport")
      expect(parentOf("base")?.classList).toContain("v-ng-viewport")
      expect(parentOf("front")?.classList).toContain("v-ng-viewport")
    }
  )
})

describe("grid", () => {
  const grid = (configs: UserConfigs["view"] = {}) =>
    graph({ view: { grid: { visible: true }, ...configs } })
  const lines = (container: Element) =>
    Array.from(container.querySelectorAll(".v-ng-background-grid path"))

  test.each([false, true])("follows the pan and zoom (lite: %s)", async lite => {
    const { screen, graph: instance } = await mountGraph(grid(), { lite })
    const background = screen.container.querySelector(".v-ng-background-viewport")!
    const viewport = screen.container.querySelector(".v-ng-viewport")!
    const before = lines(screen.container).map(l => l.getAttribute("d"))
    expect(before.length).toBeGreaterThan(0)

    instance.panBy({ x: 30, y: 20 })
    instance.zoomIn()
    await expect
      .poll(() => background.getAttribute("transform"))
      .toBe(viewport.getAttribute("transform"))
    await expect
      .poll(() => lines(screen.container).map(l => l.getAttribute("d")))
      .not.toEqual(before)
  })

  test("appears where the view is when made visible after the load", async () => {
    const { screen, state, graph: instance } = await mountGraph(graph())
    instance.panBy({ x: 30, y: 20 })
    const visibleFrom = () => lines(screen.container).map(l => l.getAttribute("d"))

    state.configs.view.grid = { visible: true }
    await nextTick()
    const panned = visibleFrom()

    state.configs.view.grid = { visible: false }
    await nextTick()
    instance.panBy({ x: -30, y: -20 })
    state.configs.view.grid = { visible: true }
    await nextTick()
    expect(visibleFrom()).not.toEqual(panned)
  })

  test.each([
    { name: "the thin lines", line: 2, thick: 0 },
    { name: "the thick lines", line: 0, thick: 4 },
  ])("offsets the dashes of $name only to the view", async ({ line, thick }) => {
    const { screen } = await mountGraph(
      grid({ grid: { visible: true, line: { dasharray: line }, thick: { dasharray: thick } } })
    )
    const offsets = lines(screen.container).map(l => l.getAttribute("stroke-dashoffset") !== null)
    expect(offsets).toContain(true)
    expect(offsets).toContain(false)
  })
})

describe("label backgrounds", () => {
  const background = (config: object) =>
    graph({ node: { label: { background: { visible: true, ...config } } } })
  const rectOf = (container: Element) => container.querySelector(".v-ng-text-background")

  test("draws the background with the padding, the radius and the color", async () => {
    const { screen } = await mountGraph(
      background({ padding: { vertical: 2, horizontal: 5 }, borderRadius: 3, color: "#ff0000" })
    )
    const rect = rectOf(screen.container)!
    const text = screen.container.querySelector(".v-ng-node-label text") as SVGTextElement
    const bbox = text.getBBox()

    await expect.poll(() => Number(rect.getAttribute("width"))).toBeCloseTo(bbox.width + 10)
    expect(rect.getAttribute("rx")).toBe("3")
    expect(rect.getAttribute("fill")).toBe("#ff0000")
  })

  test("pads the background on all sides with a number, white and square by default", async () => {
    const { screen } = await mountGraph(background({ padding: 2 }))
    const rect = rectOf(screen.container)!
    const text = screen.container.querySelector(".v-ng-node-label text") as SVGTextElement

    await expect
      .poll(() => Number(rect.getAttribute("width")))
      .toBeCloseTo(text.getBBox().width + 4)
    expect(rect.getAttribute("rx")).toBe("0")
    expect(rect.getAttribute("fill")).toBe("#ffffff")
  })

  test("shows and hides the background with its visibility", async () => {
    const { screen, state } = await mountGraph(background({ visible: false }))
    expect(rectOf(screen.container)).toBeNull()

    state.configs.node!.label!.background!.visible = true
    await nextTick()
    await expect
      .poll(() => Number(rectOf(screen.container)?.getAttribute("width")))
      .toBeGreaterThan(0)

    state.configs.node!.label!.background!.visible = false
    await nextTick()
    expect(rectOf(screen.container)).toBeNull()
  })

  test("an edge label over its line gets a background, turned with the label", async () => {
    const { screen } = await mountGraph(graph(), {
      slots: { "edge-label": (p: object) => h(VEdgeLabel, { ...p, text: "label" }) },
    })
    const rect = rectOf(screen.container)!
    const text = screen.container.querySelector(".v-ng-edge-label")!

    await expect.poll(() => rect.getAttribute("transform")).toBe(text.getAttribute("transform"))
  })

  test("follows its label as it moves with the size of the node", async () => {
    const props = background({})
    props.configs!.node!.normal = { radius: 16 }
    const { screen, state } = await mountGraph(props)
    const rect = rectOf(screen.container)!
    const text = screen.container.querySelector(".v-ng-node-label text")!
    const before = text.getAttribute("transform")
    await expect.poll(() => rect.getAttribute("transform")).toBe(before)

    state.configs.node!.normal!.radius = 30
    await expect.poll(() => text.getAttribute("transform")).not.toBe(before)
    await expect.poll(() => rect.getAttribute("transform")).toBe(text.getAttribute("transform"))
  })

  test("a label text with no transform gets a background with none", async () => {
    const config = {
      fontSize: 10,
      color: "#000000",
      lineHeight: 1,
      background: { visible: true },
    }
    const { screen } = await mountGraph(graph(), {
      slots: { back: () => h(VLabelText, { text: "a", config }) },
    })
    const rect = rectOf(screen.container)!
    await expect.poll(() => Number(rect.getAttribute("width"))).toBeGreaterThan(0)
    expect(rect.hasAttribute("transform")).toBe(false)
  })

  test("an edge label keeps the background of its config", async () => {
    const { screen } = await mountGraph(graph(), {
      slots: {
        "edge-label": (p: { config: object }) =>
          h(VEdgeLabel, {
            ...p,
            text: "label",
            config: { ...p.config, background: { visible: true, color: "#00ff00" } },
          }),
      },
    })
    expect(rectOf(screen.container)?.getAttribute("fill")).toBe("#00ff00")
  })
})

describe("label text", () => {
  test("takes the font family and the color given, over those of the config", async () => {
    const config = { fontSize: 10, fontFamily: "monospace", color: "#000000", lineHeight: 1 }
    const { screen } = await mountGraph(graph(), {
      slots: {
        back: () => [
          h(VLabelText, {
            class: "given",
            text: "a",
            config,
            "font-family": "serif",
            fill: "#ff0000",
          }),
          h(VLabelText, { class: "default", text: "b", config }),
        ],
      },
    })
    const attrs = (cls: string) => {
      const text = screen.container.querySelector(`text.${cls}`)!
      return [text.getAttribute("font-family"), text.getAttribute("fill")]
    }
    expect(attrs("given")).toEqual(["serif", "#ff0000"])
    expect(attrs("default")).toEqual(["monospace", "#000000"])
  })
})

describe("edge labels", () => {
  // From the source to the target: rightwards, leftwards, downwards and upwards.
  const directions = {
    right: [-100, 0, 100, 0],
    left: [100, 0, -100, 0],
    down: [0, -100, 0, 100],
    up: [0, 100, 0, -100],
  } as const

  test.each([
    ["source", "right", "start"],
    ["source", "left", "end"],
    ["source", "down", "end"],
    ["source", "up", "start"],
    ["target", "right", "end"],
    ["target", "left", "start"],
    ["target", "down", "start"],
    ["target", "up", "end"],
    ["center", "right", "middle"],
  ] as const)(
    "aligned to the %s of an edge going %s, the text is anchored at its %s",
    async (align, direction, anchor) => {
      const [x1, y1, x2, y2] = directions[direction]
      const props = graph()
      props.layouts = { nodes: { node1: { x: x1, y: y1 }, node2: { x: x2, y: y2 } } }
      const baselines: Record<string, string> = {}
      for (const verticalAlign of ["above", "center", "below"] as const) {
        const { screen } = await mountGraph(props, {
          slots: {
            "edge-label": (p: object) =>
              h(VEdgeLabel, { ...p, text: "label", align, verticalAlign }),
          },
        })
        const text = screen.container.querySelector(".v-ng-edge-label")!
        expect(text.getAttribute("text-anchor")).toBe(anchor)
        baselines[verticalAlign] = text.getAttribute("dominant-baseline")!
        screen.unmount()
      }
      expect(baselines).toEqual({ above: "text-top", center: "central", below: "hanging" })
    }
  )

  test.each([
    { direction: "left", layout: [100, 0, -100, 0], angle: 0 },
    { direction: "up and left", layout: [100, 100, -100, -100], angle: 45 },
  ])("a label on an edge going $direction is not upside down", async ({ layout, angle }) => {
    const [x1, y1, x2, y2] = layout
    const props = graph()
    props.layouts = { nodes: { node1: { x: x1, y: y1 }, node2: { x: x2, y: y2 } } }
    const { screen } = await mountGraph(props, {
      slots: { "edge-label": (p: object) => h(VEdgeLabel, { ...p, text: "label" }) },
    })
    const transform = screen.container.querySelector(".v-ng-edge-label")?.getAttribute("transform")
    expect(transform).toMatch(new RegExp(`^rotate\\(${angle} `))
  })
})

describe("edge overlay", () => {
  test("the point at a length that is not a number is the start of the edge", async () => {
    const { screen } = await mountGraph(graph(), {
      slots: {
        "edge-overlay": ({ pointAtLength }: { pointAtLength: (d: number) => { x: number } }) =>
          h("circle", { class: "overlay", cx: pointAtLength(NaN).x, r: 2 }),
      },
    })
    const cx = Number(screen.container.querySelector("circle.overlay")?.getAttribute("cx"))
    expect(cx).toBeLessThan(-80)
  })
})

describe("node labels", () => {
  const label = (container: Element) =>
    page.elementLocator(container.querySelector(".v-ng-node-label text, text.v-ng-node-label")!)

  test.each([false, true])("handle the events of their nodes (lite: %s)", async lite => {
    const { screen, state, events } = await mountGraph(graph({ node: { selectable: true } }), {
      lite,
    })

    await userEvent.hover(label(screen.container))
    await userEvent.dblClick(label(screen.container))
    await userEvent.click(label(screen.container), { button: "right" })
    expect(payloadsOf(events, "node:pointerover")).toMatchObject([{ node: "node1" }])
    expect(payloadsOf(events, "node:pointerdown")).toMatchObject([
      { node: "node1" },
      { node: "node1" },
    ])
    expect(payloadsOf(events, "node:dblclick")).toMatchObject([{ node: "node1" }])
    expect(payloadsOf(events, "node:contextmenu")).toMatchObject([{ node: "node1" }])
    expect(state.selectedNodes).toEqual(["node1"])

    await userEvent.hover(screen.container.querySelector("svg")!, { position: at(0, 150) })
    expect(payloadsOf(events, "node:pointerout")).toMatchObject([{ node: "node1" }])
  })

  test.each([false, true])(
    "leave the events alone without handleNodeEvents (lite: %s)",
    async lite => {
      const { screen, state, events } = await mountGraph(
        graph({ node: { selectable: true, label: { handleNodeEvents: false } } }),
        { lite }
      )

      await userEvent.click(label(screen.container))
      expect(payloadsOf(events, "node:click")).toEqual([])
      expect(state.selectedNodes).toEqual([])
    }
  )

  test.each([false, true])("are left out for a text that is not given (lite: %s)", async lite => {
    const { screen } = await mountGraph(graph({ node: { label: { text: () => undefined } } }), {
      lite,
    })
    expect(screen.container.querySelectorAll(".v-ng-node-label")).toHaveLength(0)
  })
})

describe("lite objects", () => {
  test.each(["circle", "rect"] as const)("a %s node emits the events of a pointer", async type => {
    const { canvas, events } = await mountGraph(
      graph({ node: { normal: { type, width: 32, height: 32 } } }),
      { lite: true }
    )

    await userEvent.hover(canvas, { position: at(-100, 0) })
    await userEvent.dblClick(canvas, { position: at(-100, 0) })
    await userEvent.click(canvas, { position: at(-100, 0), button: "right" })
    await userEvent.hover(canvas, { position: at(0, 100) })
    expect(payloadsOf(events, "node:pointerover")).toMatchObject([{ node: "node1" }])
    expect(payloadsOf(events, "node:dblclick")).toMatchObject([{ node: "node1" }])
    expect(payloadsOf(events, "node:contextmenu")).toMatchObject([{ node: "node1" }])
    expect(payloadsOf(events, "node:pointerout")).toMatchObject([{ node: "node1" }])
  })

  test("an edge emits a double click and a context menu, and draws its source marker", async () => {
    const { screen, canvas, events } = await mountGraph(
      graph({ edge: { marker: { source: { type: "arrow" } } } }),
      { lite: true }
    )

    await userEvent.dblClick(canvas, { position: at(0, 0) })
    await userEvent.click(canvas, { position: at(0, 0), button: "right" })
    expect(payloadsOf(events, "edge:dblclick")).toMatchObject([{ edge: "edge1" }])
    expect(payloadsOf(events, "edge:contextmenu")).toMatchObject([{ edge: "edge1" }])
    expect(screen.container.querySelector(".v-ng-lite-edge")?.getAttribute("marker-start")).toMatch(
      /^url\(/
    )
  })
})

describe("focus ring", () => {
  test.each([
    {
      name: "a circle with no stroke width",
      normal: { type: "circle", strokeWidth: () => undefined },
    },
    { name: "a rect with no stroke width", normal: { type: "rect", strokeWidth: () => undefined } },
    { name: "a rect with square corners", normal: { type: "rect", borderRadius: 0 } },
  ] as const)("is drawn around $name", async ({ normal }) => {
    const props = graph({ node: { selectable: true, normal } })
    props.selectedNodes = ["node1"]
    const { screen } = await mountGraph(props)
    const ring = screen.container.querySelector(".v-ng-node-focusring")
    expect(ring).not.toBeNull()
  })
})

describe("VStyle", () => {
  test("puts its content in a style element", async () => {
    const screen = await render(() =>
      h("svg", [h(VStyle, null, { default: () => ".a { fill: red; }" })])
    )
    expect(screen.container.querySelector("svg > defs > style")?.textContent).toBe(
      ".a { fill: red; }"
    )
  })
})
