import { onTestFinished, vi } from "vitest"
import { render } from "vitest-browser-vue"
import type { RenderResult } from "vitest-browser-vue"
import { Component, camelize, defineComponent, h, reactive, toRaw } from "vue"
import * as components from "@/components/index"
import VNetworkGraphPlugin from "@/index"
import { inContainer, movePointerAway } from "./container"
import type { GraphState } from "./updates"

/** Renders in a fixed-size container and waits until the graph stops moving. */
export async function renderFixture(component: Component) {
  const screen = await render(
    defineComponent(() => () => inContainer(h(component))),
    { global: { plugins: [VNetworkGraphPlugin] } }
  )
  await waitUntilShown(screen.container)
  return screen
}

const DATA_PROPS = ["nodes", "edges", "paths", "layouts"] as const
const VIEW_PROPS = ["selectedNodes", "selectedEdges", "selectedPaths", "zoomLevel"] as const

/**
 * Renders as `renderFixture` does, with the props that the fixture passes to the graph in
 * `state`, so that a test can change them. `prepare` changes them before the graph mounts.
 * The data is changed in place, since the slots of the fixtures read it, and as the fixtures
 * share it between mounts, `unmount` puts it back, as the end of the test does.
 */
export async function renderFixtureWithState(
  component: Component,
  prepare?: (state: GraphState) => void
) {
  let state: GraphState | undefined
  const originals: [object, object][] = []
  const GraphWithState = defineComponent({
    inheritAttrs: false,
    setup(_, { attrs, slots }) {
      // Read on each render, so that the other props follow the fixture.
      const given = () =>
        Object.fromEntries(Object.entries(attrs).map(([k, v]) => [camelize(k), v]))
      const initial = given()
      const data = Object.fromEntries(
        DATA_PROPS.map(key => {
          const value = toRaw(initial[key] ?? (key === "layouts" ? { nodes: {} } : {})) as object
          originals.push([value, cloneData(value)])
          return [key, value]
        })
      ) as Pick<GraphState, (typeof DATA_PROPS)[number]>
      const s: GraphState = reactive({
        selectedNodes: [],
        selectedEdges: [],
        selectedPaths: [],
        zoomLevel: 1,
        ...Object.fromEntries(VIEW_PROPS.filter(k => k in initial).map(k => [k, initial[k]])),
        ...data,
      })
      prepare?.(s)
      state = s
      const listeners = Object.fromEntries(
        [...DATA_PROPS, ...VIEW_PROPS].map(key => [
          `onUpdate:${key}`,
          (v: unknown) => {
            Object.assign(s, { [key]: v })
            ;(given()[`onUpdate:${key}`] as ((v: unknown) => void) | undefined)?.(v)
          },
        ])
      )
      return () => h(components.VNetworkGraph, { ...given(), ...s, ...listeners }, slots)
    },
  })
  let screen: RenderResult<unknown> | undefined
  const unmount = () => {
    screen?.unmount()
    screen = undefined
    originals.splice(0).forEach(([value, original]) => restore(value, original))
  }
  onTestFinished(unmount)
  screen = await render(
    defineComponent(() => () => inContainer(h(component))),
    { global: { components: { ...components, VNetworkGraph: GraphWithState } } }
  )
  await waitUntilShown(screen.container)
  return { screen, state: state!, unmount }
}

/** A deep copy of plain objects and arrays that keeps anything else, such as functions, as is. */
function cloneData<T>(value: T): T {
  if (Array.isArray(value)) return value.map(cloneData) as T
  if (isPlainObject(value)) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, cloneData(v)])) as T
  }
  return value
}

/** Puts back the contents of `target` as they were in `original`, keeping the objects. */
function restore(target: object, original: object) {
  const t = target as Record<string, unknown>
  const o = original as Record<string, unknown>
  if (Array.isArray(t)) t.length = 0
  Object.keys(t).forEach(key => key in o || delete t[key])
  for (const [key, value] of Object.entries(o)) {
    const current = t[key]
    if (current && typeof current === "object" && value && typeof value === "object") {
      restore(current, value)
    } else {
      t[key] = cloneData(value)
    }
  }
}

function isPlainObject(value: unknown): value is object {
  return !!value && Object.getPrototypeOf(value) === Object.prototype
}

async function waitUntilShown(container: Element) {
  await vi.waitUntil(() => container.querySelector(".v-ng-canvas.show"), { timeout: 5000 })
  await movePointerAway()
  await waitUntilStill(container)
}

// The force layout moves the nodes on animation frames until its simulation ends.
export async function waitUntilStill(container: Element, stillFrames = 5, timeout = 20000) {
  const deadline = performance.now() + timeout
  let previous = container.innerHTML
  let count = 0
  while (count < stillFrames) {
    await new Promise(resolve => requestAnimationFrame(resolve))
    const current = container.innerHTML
    count = current === previous ? count + 1 : 0
    if (performance.now() > deadline) throw new Error("The graph did not stop moving")
    previous = current
  }
}
