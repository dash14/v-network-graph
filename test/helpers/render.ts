import { vi } from "vitest"
import { render } from "vitest-browser-vue"
import { Component, defineComponent, h } from "vue"
import VNetworkGraphPlugin from "@/index"
import { inContainer, movePointerAway } from "./container"

/** Renders in a fixed-size container and waits until the graph stops moving. */
export async function renderFixture(component: Component) {
  const screen = await render(
    defineComponent(() => () => inContainer(h(component))),
    { global: { plugins: [VNetworkGraphPlugin] } }
  )
  await vi.waitUntil(() => screen.container.querySelector(".v-ng-canvas.show"), { timeout: 5000 })
  await movePointerAway()
  await waitUntilStill(screen.container)
  return screen
}

// The force layout moves the nodes on animation frames until its simulation ends.
async function waitUntilStill(container: Element, stillFrames = 5, timeout = 20000) {
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
