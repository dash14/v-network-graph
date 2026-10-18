import { vi } from "vitest"
import { render } from "vitest-browser-vue"
import { Component, defineComponent, h } from "vue"
import VNetworkGraphPlugin from "@/index"

/**
 * Render a component that contains a graph, in a container of a
 * fixed size, and wait until the graph has been displayed.
 */
export async function renderFixture(component: Component) {
  const screen = await render(
    defineComponent(
      () => () => h("div", { style: { width: "600px", height: "400px" } }, [h(component)])
    ),
    { global: { plugins: [VNetworkGraphPlugin] } }
  )
  await vi.waitUntil(() => screen.container.querySelector(".v-ng-canvas.show"), { timeout: 5000 })
  return screen
}
