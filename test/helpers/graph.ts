import { vi } from "vitest"
import { render } from "vitest-browser-vue"
import { page, userEvent } from "vitest/browser"
import type { Locator } from "vitest/browser"
import { defineComponent, h, reactive, ref } from "vue"
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
import { HEIGHT, WIDTH, inContainer, movePointerAway } from "./container"

export interface GraphProps {
  nodes: Nodes
  edges?: Edges
  paths?: InputPaths
  layouts: Layouts
  configs?: UserConfigs
  selectedNodes?: string[]
  selectedEdges?: string[]
  selectedPaths?: string[]
}

export interface RecordedEvent {
  type: keyof Events
  payload: unknown
}

type Position = { x: number; y: number }

/**
 * Mounts a graph whose origin is at the center of a fixed-size
 * container, with the v-model props and the emitted events recorded.
 */
export async function mountGraph(props: GraphProps) {
  const { configs, ...data } = props
  const initial: Required<GraphProps> = {
    edges: {},
    paths: {},
    selectedNodes: [],
    selectedEdges: [],
    selectedPaths: [],
    // The graph updates the layouts in place, so each test gets its own copy.
    ...structuredClone(data),
    configs: {
      ...configs,
      // at() relies on the origin being at the center.
      view: { ...configs?.view, autoPanAndZoomOnLoad: "center-zero" },
    },
  }
  const state = reactive(initial)
  const events: RecordedEvent[] = []
  const eventHandlers: EventHandlers = {
    "*": (type, payload) => events.push({ type, payload }),
  }
  const graph = ref<VNetworkGraphInstance>()
  const screen = await render(
    defineComponent(
      () => () =>
        inContainer(
          h(VNetworkGraph, {
            ref: graph,
            nodes: state.nodes,
            edges: state.edges,
            paths: state.paths,
            configs: state.configs,
            eventHandlers,
            layouts: state.layouts,
            "onUpdate:layouts": (v: Layouts) => (state.layouts = v),
            selectedNodes: state.selectedNodes,
            "onUpdate:selectedNodes": (v: string[]) => (state.selectedNodes = v),
            selectedEdges: state.selectedEdges,
            "onUpdate:selectedEdges": (v: string[]) => (state.selectedEdges = v),
            selectedPaths: state.selectedPaths,
            "onUpdate:selectedPaths": (v: string[]) => (state.selectedPaths = v),
          })
        )
    )
  )
  await vi.waitUntil(() => events.some(e => e.type === "view:load"), { timeout: 5000 })
  const canvas = page.elementLocator(screen.container.querySelector("svg.v-ng-canvas")!)

  await movePointerAway()
  events.splice(0)

  return { screen, canvas, graph: graph.value!, state, events }
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
