import { describe, expect, test } from "vitest"
import { render } from "vitest-browser-vue"
import { page, userEvent } from "vitest/browser"
import { h, nextTick, reactive } from "vue"
import { VEdgeLabel, VLabelText, VStyle } from "@/index"
import type {
  NodeLabelDirectionAutoAdjustmentHandler,
  UserConfigs,
  VNetworkGraphInstance,
} from "@/index"
import type { GraphProps } from "./helpers/graph"
import { at, catchErrors, mountGraph, payloadsOf } from "./helpers/graph"

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
    const transform = viewport.getAttribute("transform")

    instance.panBy({ x: 30, y: 20 })
    instance.zoomIn()
    // svg-pan-zoom moves the viewport on the next animation frame.
    await expect.poll(() => viewport.getAttribute("transform")).not.toBe(transform)
    await expect
      .poll(() => background.getAttribute("transform") === viewport.getAttribute("transform"))
      .toBe(true)
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
    const background = screen.container.querySelector(".v-ng-background-viewport")!
    const viewport = screen.container.querySelector(".v-ng-viewport")!
    for (const attr of ["transform", "style"]) {
      expect(background.getAttribute(attr) ?? "").toBe(viewport.getAttribute(attr) ?? "")
    }
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

describe("grid lines", () => {
  const gridProps = () => {
    const props = graph({
      view: { grid: { visible: true, line: { dasharray: 2 }, thick: { dasharray: 4 } } },
    })
    props.zoomLevel = 2
    return props
  }
  const linesOf = (container: Element) =>
    Array.from(container.querySelectorAll(".v-ng-background-grid path")).map(l => ({
      d: l.getAttribute("d"),
      dasharray: l.getAttribute("stroke-dasharray"),
      dashoffset: l.getAttribute("stroke-dashoffset"),
    }))
  const range = (from: number, to: number) =>
    Array.from({ length: (to - from) / 10 + 1 }, (_, i) => from + i * 10)
  const dasharray = (v: number) => (v % 50 === 0 ? "4" : "2")

  test("cover the view at a zoom level, every fifth one thick, with the dashes offset to the view", async () => {
    // The 600x400 view at a zoom level of 2 spans from (-150, -100) to (150, 100).
    const { screen } = await mountGraph(gridProps())
    const lines = linesOf(screen.container)
    const horizontals = range(-100, 100).map(y => ({
      d: `M -150 ${y} L 155 ${y}`,
      dasharray: dasharray(y),
      dashoffset: "-300",
    }))
    const verticals = range(-150, 150).map(x => ({
      d: `M ${x} -100 L ${x} 105`,
      dasharray: dasharray(x),
      dashoffset: "-200",
    }))
    expect(lines).toHaveLength(horizontals.length + verticals.length)
    expect(lines).toEqual(expect.arrayContaining([...horizontals, ...verticals]))
  })

  test.each([
    {
      name: "after a zoom that pans the view",
      setUp: async (instance: VNetworkGraphInstance) => {
        instance.panBy({ x: 30, y: 20 })
        await expect.poll(() => instance.getPan().x).toBe(330)
        instance.zoomIn()
      },
    },
    {
      name: "when made visible after a pan",
      setUp: async (instance: VNetworkGraphInstance, showGrid: (visible: boolean) => void) => {
        showGrid(false)
        await nextTick()
        instance.panBy({ x: 30, y: 20 })
        await expect.poll(() => instance.getPan().x).toBe(330)
        showGrid(true)
      },
    },
  ])("start at the left top of the view $name", async ({ setUp }) => {
    const { screen, state, graph: instance } = await mountGraph(gridProps())
    await setUp(instance, visible => {
      state.configs.view.grid = { ...state.configs.view.grid, visible }
    })
    await expect
      .poll(() => {
        const { left, top } = instance.getViewBox()
        const starts = linesOf(screen.container).map(l => l.d!.split(" ").map(Number))
        return starts.some(([, x, y]) => x === left && y === Math.floor(top / 10) * 10)
      })
      .toBe(true)
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
    const config = state.configs.node!.label!.background as { visible: boolean }
    expect(rectOf(screen.container)).toBeNull()

    config.visible = true
    await nextTick()
    await expect
      .poll(() => Number(rectOf(screen.container)?.getAttribute("width")))
      .toBeGreaterThan(0)

    config.visible = false
    await nextTick()
    expect(rectOf(screen.container)).toBeNull()
  })

  test("an edge label over its line gets a background, turned with the label", async () => {
    const { screen } = await mountGraph(graph(), {
      slots: { "edge-label": (p: any) => h(VEdgeLabel, { ...p, text: "label" }) },
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

  test("pads the background by the padding scaled to the zoom, and by the line height", async () => {
    // At a zoom level of 2, the font of 10 is drawn at 5 with lines of 7.5.
    const config = {
      fontSize: 10,
      color: "#000000",
      lineHeight: 1.5,
      background: { visible: true, padding: { vertical: 2, horizontal: 4 } },
    }
    const { screen } = await mountGraph(
      { ...graph(), zoomLevel: 2 },
      { slots: { back: () => h(VLabelText, { text: "a", config }) } }
    )
    const rect = rectOf(screen.container)!
    const bbox = (screen.container.querySelector("text.v-ng-text") as SVGTextElement).getBBox()
    const box = () => ["x", "y", "width", "height"].map(a => Number(rect.getAttribute(a)))

    await expect
      .poll(box)
      .toEqual([bbox.x - 2, bbox.y - 1 - 1.25, bbox.width + 4, bbox.height + 2 + 2.5])
  })

  test("follows the position and the font size of its text", async () => {
    const config = { fontSize: 10, color: "#000000", lineHeight: 1, background: { visible: true } }
    const text = reactive({ x: 0, y: 0, fontSize: 10 })
    const { screen } = await mountGraph(graph(), {
      slots: {
        back: () =>
          h(VLabelText, { text: "a", config, x: text.x, y: text.y, "font-size": text.fontSize }),
      },
    })
    const rect = rectOf(screen.container)!
    const element = screen.container.querySelector("text.v-ng-text") as SVGTextElement
    const box = () => ["x", "y", "width", "height"].map(a => Number(rect.getAttribute(a)))
    const bboxOf = () => {
      const b = element.getBBox()
      return [b.x, b.y, b.width, b.height]
    }

    for (const change of [{ x: 30 }, { y: 20 }, { fontSize: 20 }]) {
      const before = box()
      Object.assign(text, change)
      await expect.poll(box).not.toEqual(before)
      expect(box()).toEqual(bboxOf())
    }
  })

  test("an edge label keeps the background of its config", async () => {
    const { screen } = await mountGraph(graph(), {
      slots: {
        "edge-label": (p: any) =>
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

describe("edge labels", () => {
  const config = { fontSize: 10, color: "#000000", lineHeight: 1, margin: 0, padding: 0 }
  // The label area of a line from (10, 0) to (110, 0), 30 high, with its middle 5 below the line.
  const area = {
    source: { above: { x: 10, y: -10 }, below: { x: 10, y: 20 } },
    target: { above: { x: 110, y: -10 }, below: { x: 110, y: 20 } },
  }
  const label = async (props: object) => {
    const { screen } = await mountGraph(graph(), {
      slots: { back: () => h(VEdgeLabel, { area, config, text: "label", ...props }) },
    })
    const text = screen.container.querySelector("text.v-ng-edge-label")!
    return (...names: string[]) => names.map(n => text.getAttribute(n))
  }

  test.each([
    ["source", ["10", "5", "start"]],
    ["target", ["110", "5", "end"]],
    ["center", ["60", "5", "middle"]],
  ])(
    "a label aligned to the %s and centered vertically is placed halfway down the area",
    async (align, attrs) => {
      const attrsOf = await label({ align })
      expect(attrsOf("x", "y", "text-anchor", "dominant-baseline")).toEqual([...attrs, "central"])
    }
  )

  test.each(["source", "target"])(
    "a label aligned to the %s of an edge of no length ends at the point",
    async align => {
      const point = { above: { x: 0, y: 0 }, below: { x: 0, y: 10 } }
      const attrsOf = await label({ align, area: { source: point, target: point } })
      expect(attrsOf("text-anchor")).toEqual(["end"])
    }
  )

  test.each([
    ["up", { x: 0, y: 100 }, { x: 0, y: 0 }],
    ["down", { x: 0, y: 0 }, { x: 0, y: 100 }],
  ])("the label of a vertical edge going %s is turned to read upward", async (_, s, t) => {
    const attrsOf = await label({
      area: { source: { above: s, below: s }, target: { above: t, below: t } },
    })
    expect(attrsOf("transform")).toEqual(["rotate(-90 0 50)"])
  })

  test("a label with a null text is drawn empty", async () => {
    const { screen } = await mountGraph(graph(), {
      slots: { back: () => h(VEdgeLabel, { area, config, text: null as unknown as string }) },
    })
    expect(screen.container.querySelector("text.v-ng-edge-label")?.textContent).toBe("")
  })

  test("a label over its line gets a white background padded by 4 and 1", async () => {
    const { screen } = await mountGraph(graph(), {
      slots: { back: () => h(VEdgeLabel, { area, config, text: "label" }) },
    })
    const rect = screen.container.querySelector(".v-ng-text-background")!
    const bbox = (
      screen.container.querySelector("text.v-ng-edge-label") as SVGTextElement
    ).getBBox()

    await expect.poll(() => Number(rect.getAttribute("width"))).toBeCloseTo(bbox.width + 8)
    expect(Number(rect.getAttribute("height"))).toBeCloseTo(bbox.height + 2)
    expect([rect.getAttribute("fill"), rect.getAttribute("rx")]).toEqual(["#ffffff", "2"])
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

describe("node labels", () => {
  // A margin of 6 and a zoom level of 2, so that the shapes and the margin are drawn at half size.
  const placed = async (shape: UserConfigs["node"], direction: string) => {
    const props = graph({
      node: { ...shape, label: { margin: 6, direction: direction as any } },
    })
    props.zoomLevel = 2
    let position: { x: number; y: number } | undefined
    await mountGraph(props, {
      slots: {
        "override-node-label": ({ nodeId, x, y }: { nodeId: string; x: number; y: number }) => {
          if (nodeId === "node1") position = { x, y }
          return h("text")
        },
      },
    })
    return position!
  }
  const rect = { normal: { type: "rect" as const, width: 40, height: 20, borderRadius: 4 } }
  // The corner of a rect is rounded by 2, with the margin of 3 along the diagonal from it.
  const diagonal = Math.sqrt((2 + 3) ** 2 / 2)

  test.each([
    ["east", { x: 13, y: 0 }],
    ["south", { x: 0, y: 8 }],
    ["north-east", { x: 10 - 2 + diagonal, y: -(5 - 2 + diagonal) }],
    ["center", { x: 0, y: 0 }],
  ])("a label to the %s of a rect node is placed off its side", async (direction, expected) => {
    const { x, y } = await placed(rect, direction)
    expect(x).toBeCloseTo(expected.x)
    expect(y).toBeCloseTo(expected.y)
  })

  const labelOf = (container: Element, id: string) =>
    container.querySelectorAll(".v-ng-node-label text")[Number(id.replace("node", "")) - 1]

  test("a label takes the direction the user's function gives", async () => {
    const north: NodeLabelDirectionAutoAdjustmentHandler = () => "north"
    const { screen } = await mountGraph(
      // Returned by a function, as a function given in the configs is called with the node.
      graph({ node: { label: { directionAutoAdjustment: () => north } } })
    )
    expect(labelOf(screen.container, "node1").getAttribute("dominant-baseline")).toBe("text-top")
  })

  test("a label adjusts its direction as a node at the other end of an edge moves", async () => {
    const props = graph({ node: { label: { directionAutoAdjustment: true } } })
    props.nodes!.node3 = { name: "Node 3" }
    props.edges!.edge2 = { source: "node1", target: "node3" }
    props.layouts!.nodes.node3 = { x: -100, y: -100 }
    const { screen, state } = await mountGraph(props)
    const label = labelOf(screen.container, "node1")
    expect(label.getAttribute("dominant-baseline")).toBe("hanging")

    // Below node1, where its label is, while node3 stays above it.
    state.layouts.nodes.node2 = { x: -100, y: 100 }

    await expect.poll(() => label.getAttribute("dominant-baseline")).toBe("central")
  })

  test("a node moved while its self-loop is removed adjusts its label without errors", async () => {
    const errors = catchErrors()
    const props = graph({ node: { label: { directionAutoAdjustment: true } } })
    props.edges!.loop = { source: "node1", target: "node1" }
    const { state } = await mountGraph(props)

    delete state.edges.loop
    state.layouts.nodes.node1 = { x: -100, y: 50 }
    await nextTick()
    await nextTick()
    expect(errors).toEqual([])
  })

  test("a label to the north-west of a circle node is placed off it along the diagonal", async () => {
    const { x, y } = await placed({ normal: { type: "circle", radius: 10 } }, "north-west")
    const d = Math.sqrt((5 + 3) ** 2 / 2)
    expect(x).toBeCloseTo(-d)
    expect(y).toBeCloseTo(-d)
  })
})

describe("node shapes at a zoom level", () => {
  test("a rect node and its label are drawn at half size at a zoom level of 2", async () => {
    const props = graph({
      node: {
        normal: { type: "rect", width: 40, height: 20, borderRadius: 4, strokeWidth: 2 },
        label: { fontSize: 20 },
      },
    })
    props.zoomLevel = 2
    const { screen } = await mountGraph(props)
    const rect = screen.container.querySelector(".v-ng-node rect")!
    expect(
      Object.fromEntries(
        ["x", "width", "height", "rx", "stroke-width"].map(n => [n, Number(rect.getAttribute(n))])
      )
    ).toEqual({ x: -10, width: 20, height: 10, rx: 2, "stroke-width": 1 })
    const text = screen.container.querySelector(".v-ng-node-label text")!
    expect(Number(text.getAttribute("font-size"))).toBe(10)
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
            "edge-label": (p: any) => h(VEdgeLabel, { ...p, text: "label", align, verticalAlign }),
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
      slots: { "edge-label": (p: any) => h(VEdgeLabel, { ...p, text: "label" }) },
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
    // Depending on the environment, the pointer may enter other nodes on its way.
    expect(payloadsOf(events, "node:pointerover").at(-1)).toMatchObject({ node: "node1" })
    await userEvent.dblClick(label(screen.container))
    await userEvent.click(label(screen.container), { button: "right" })
    expect(payloadsOf(events, "node:pointerdown")).toMatchObject([
      { node: "node1" },
      { node: "node1" },
    ])
    expect(payloadsOf(events, "node:dblclick")).toMatchObject([{ node: "node1" }])
    expect(payloadsOf(events, "node:contextmenu")).toMatchObject([{ node: "node1" }])
    expect(state.selectedNodes).toEqual(["node1"])

    const left = events.length
    await userEvent.hover(screen.container.querySelector("svg")!, { position: at(0, 150) })
    expect(payloadsOf(events.slice(left), "node:pointerout")).toMatchObject([{ node: "node1" }])
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

  test.each([false, true])(
    "take the state of their nodes, only when they handle the events (lite: %s)",
    async lite => {
      const classesOf = async (handleNodeEvents: boolean) => {
        const props = graph({ node: { selectable: true, label: { handleNodeEvents } } })
        props.selectedNodes = ["node1"]
        const { screen, canvas } = await mountGraph(props, { lite })
        await userEvent.hover(canvas, { position: at(-100, 0) })
        await nextTick()
        const element = screen.container.querySelector(".v-ng-node-label")!
        const text = element.querySelector("text")
        return [...element.classList, ...(text?.classList ?? [])].filter(c =>
          ["hover", "selected", "draggable", "selectable"].includes(c)
        )
      }

      expect((await classesOf(true)).toSorted()).toEqual([
        "draggable",
        "hover",
        "selectable",
        "selected",
      ])
      expect(await classesOf(false)).toEqual([])
    }
  )

  test("of the lite graph have the classes of a lite label and of a text", async () => {
    const { screen } = await mountGraph(graph(), { lite: true })
    const classes = screen.container.querySelector("text.v-ng-node-label")!.classList
    expect([...classes]).toEqual(expect.arrayContaining(["v-ng-lite-node-label", "v-ng-text"]))
  })

  test.each([false, true])("are left out for a node with no text (lite: %s)", async lite => {
    const props = graph()
    props.nodes = { node1: {}, node2: {} }
    const { screen } = await mountGraph(props, { lite })
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
  const ringOf = async (normal: NonNullable<UserConfigs["node"]>["normal"]) => {
    const props = graph({ node: { selectable: true, normal, focusring: { width: 4, padding: 3 } } })
    props.layouts.nodes.node1 = { x: -100, y: 30 }
    props.selectedNodes = ["node1"]
    const { screen } = await mountGraph(props)
    return screen.container.querySelector(".v-ng-node-focusring")!
  }
  const attrs = (el: Element, names: string[]) =>
    Object.fromEntries(names.map(n => [n, Number(el.getAttribute(n))]))

  test("is drawn around a circle, past its stroke by the padding", async () => {
    const ring = await ringOf({ type: "circle", radius: 10, strokeWidth: 2 })
    expect(attrs(ring, ["cx", "cy", "r", "stroke-width"])).toEqual({
      cx: -100,
      cy: 30,
      r: 16,
      "stroke-width": 4,
    })
  })

  test.each([
    { name: "round corners", borderRadius: 4, rx: 10 },
    { name: "square corners", borderRadius: 0, rx: 0 },
  ])(
    "is drawn around a rect with $name, past its stroke by the padding",
    async ({ borderRadius, rx }) => {
      const ring = await ringOf({
        type: "rect",
        width: 20,
        height: 10,
        borderRadius,
        strokeWidth: 2,
      })
      expect(attrs(ring, ["width", "height", "rx"])).toEqual({ width: 32, height: 22, rx })
    }
  )
})

describe("paths", () => {
  test("start off the edge of the node by the margin scaled to the zoom level", async () => {
    const startOf = async (margin: number) => {
      const props = graph({ path: { visible: true, end: "edgeOfNode", margin } })
      props.paths = { path1: { edges: ["edge1"] } }
      props.zoomLevel = 2
      const { screen } = await mountGraph(props)
      const d = screen.container.querySelector(".v-ng-path")!.getAttribute("d")!
      return Number(d.match(/^M\s*(-?[\d.]+)/)![1])
    }
    expect((await startOf(6)) - (await startOf(0))).toBeCloseTo(3)
  })

  test("a path of no edges is drawn with no line", async () => {
    const props = graph({ path: { visible: true } })
    props.paths = { path1: { edges: [] } }
    const { screen } = await mountGraph(props)
    expect(screen.container.querySelector(".v-ng-path")?.getAttribute("d")).toBe("")
  })
})

describe("edge markers", () => {
  const markersAt = async (units: "strokeWidth" | "userSpaceOnUse") => {
    const marker = { type: "arrow", units, width: 6, height: 4, margin: 2, offset: 3 } as const
    const props = graph({ edge: { marker: { source: marker, target: marker } } })
    props.zoomLevel = 2
    const { screen } = await mountGraph(props)
    const edge = screen.container.querySelector(".v-ng-edge")!
    const markerOf = (attr: string) => {
      const id = edge.getAttribute(attr)!.match(/^url\('#(.+)'\)$/)![1]
      const el = screen.container.querySelector(`marker[id="${id}"]`)!
      return ["markerWidth", "markerHeight", "refX", "refY"].map(n => Number(el.getAttribute(n)))
    }
    return { source: markerOf("marker-start"), target: markerOf("marker-end") }
  }

  test("in the user space are scaled to the zoom level", async () => {
    expect(await markersAt("userSpaceOnUse")).toEqual({
      source: [3, 2, 4, 2.5],
      target: [3, 2, -1, -0.5],
    })
  })

  test("an angle in the user space is stroked by a fifth of its shorter side", async () => {
    const marker = { type: "angle", units: "userSpaceOnUse", width: 10, height: 5 } as const
    const props = graph({ edge: { marker: { target: marker } } })
    props.zoomLevel = 2
    const { screen } = await mountGraph(props)
    const polyline = screen.container.querySelector("marker polyline")!
    expect(polyline.getAttribute("stroke-width")).toBe("0.5")
  })

  test("in stroke widths keep their size at a zoom level", async () => {
    expect(await markersAt("strokeWidth")).toEqual({
      source: [6, 4, 8, 5],
      target: [6, 4, -2, -1],
    })
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
