import { vi } from "vitest"
import { render } from "vitest-browser-vue"
import { page, userEvent } from "vitest/browser"
import type { Locator } from "vitest/browser"
import { defineComponent, h, reactive, ref } from "vue"
import type { Slots } from "vue"
import { VNetworkGraph } from "@/index"
import type {
  Edges,
  Events,
  EventHandlers,
  InputPaths,
  Layouts,
  Nodes,
  UserConfigs,
  VNetworkGraphInstance,
} from "@/index"
import { HEIGHT, POLL_INTERVAL, WIDTH, inContainer, movePointerAway } from "./container"

export interface GraphProps {
  nodes: Nodes
  edges?: Edges
  paths?: InputPaths
  layouts: Layouts
  configs?: UserConfigs
  selectedNodes?: string[]
  selectedEdges?: string[]
  selectedPaths?: string[]
  zoomLevel?: number
}

/** A named set of props to render a graph with. */
export interface GraphCase {
  name: string
  props: GraphProps
}

export interface RecordedEvent {
  type: keyof Events
  payload: unknown
}

type Position = { x: number; y: number }

type LayoutsListener = "onUpdate:layouts" | "onUpdate:layoutsOnce" | null

/** The props with the unset ones at their defaults, and a copy of the data. */
export function fillGraphProps(props: GraphProps): Required<GraphProps> {
  const { configs = {}, ...data } = props
  return {
    edges: {},
    paths: {},
    selectedNodes: [],
    selectedEdges: [],
    selectedPaths: [],
    zoomLevel: 1,
    // The graph updates the layouts in place, so each mount gets its own copy.
    ...structuredClone(data),
    configs,
  }
}

/**
 * Mounts a graph whose origin is at the center of a fixed-size
 * container, with the v-model props and the emitted events recorded.
 */
export async function mountGraph(
  props: GraphProps,
  { layoutsListener = "onUpdate:layouts" as LayoutsListener, slots = {} as Slots } = {}
) {
  const filled = fillGraphProps(props)
  const state = reactive({
    ...filled,
    configs: {
      ...filled.configs,
      // at() relies on the origin being at the center.
      view: { ...filled.configs.view, autoPanAndZoomOnLoad: "center-zero" as const },
    },
  })
  const listener = ref(layoutsListener)
  const events: RecordedEvent[] = []
  let layoutsUpdates = 0
  const eventHandlers: EventHandlers = {
    "*": (type, payload) => events.push({ type, payload }),
  }
  // The same function on every render, so that the graph sees no listener change.
  const updateLayouts = (v: Layouts) => {
    layoutsUpdates++
    state.layouts = v
  }
  const graph = ref<VNetworkGraphInstance>()
  const screen = await render(
    defineComponent(
      () => () =>
        inContainer(
          h(
            VNetworkGraph,
            {
              ref: graph,
              nodes: state.nodes,
              edges: state.edges,
              paths: state.paths,
              configs: state.configs,
              eventHandlers,
              layouts: state.layouts,
              ...(listener.value && { [listener.value]: updateLayouts }),
              selectedNodes: state.selectedNodes,
              "onUpdate:selectedNodes": (v: string[]) => (state.selectedNodes = v),
              selectedEdges: state.selectedEdges,
              "onUpdate:selectedEdges": (v: string[]) => (state.selectedEdges = v),
              selectedPaths: state.selectedPaths,
              "onUpdate:selectedPaths": (v: string[]) => (state.selectedPaths = v),
              // Only when given, so that the other tests zoom as they would without a v-model.
              ...("zoomLevel" in props && {
                zoomLevel: state.zoomLevel,
                "onUpdate:zoomLevel": (v: number) => (state.zoomLevel = v),
              }),
            },
            slots
          )
        )
    )
  )
  await vi.waitUntil(() => events.some(e => e.type === "view:load"), {
    timeout: 5000,
    interval: POLL_INTERVAL,
  })
  // svg-pan-zoom writes the pan and zoom on the next animation frame.
  await new Promise(resolve => requestAnimationFrame(resolve))
  const canvas = page.elementLocator(screen.container.querySelector("svg.v-ng-canvas")!)

  await movePointerAway()
  events.splice(0)
  layoutsUpdates = 0

  return {
    screen,
    canvas,
    graph: graph.value!,
    state,
    events,
    layoutsUpdates: () => layoutsUpdates,
    setLayoutsListener: (v: LayoutsListener) => (listener.value = v),
  }
}

/** The position in the container of a point in the graph, at zoom level 1. */
export function at(x: number, y: number): Position {
  return { x: WIDTH / 2 + x, y: HEIGHT / 2 + y }
}

/** The element hit at a position in the container. */
export function elementAt(container: Element, position: Position) {
  const rect = container.querySelector("svg.v-ng-canvas")!.getBoundingClientRect()
  return document.elementFromPoint(rect.left + position.x, rect.top + position.y)
}

export function payloadsOf(events: RecordedEvent[], type: keyof Events) {
  return events.filter(e => e.type === type).map(e => e.payload)
}

/** Drags within the element. A move in a single step is not detected as a drag. */
export async function drag(element: Locator, from: Position, to: Position) {
  await userEvent.dragAndDrop(element, element, {
    sourcePosition: from,
    targetPosition: to,
    steps: 5,
  })
}
