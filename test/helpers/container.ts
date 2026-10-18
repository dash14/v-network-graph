import { page, userEvent } from "vitest/browser"
import { h, VNode } from "vue"

export const WIDTH = 600
export const HEIGHT = 400

/** Wraps the graph in a container of a fixed size. */
export function inContainer(child: VNode) {
  return h("div", { style: { width: `${WIDTH}px`, height: `${HEIGHT}px` } }, [child])
}

/** Moves the pointer off the graph, since it stays where the previous test left it. */
export async function movePointerAway() {
  let rest = document.getElementById("pointer-rest")
  if (!rest) {
    rest = document.createElement("div")
    rest.id = "pointer-rest"
    rest.style.cssText = "position: fixed; right: 0; bottom: 0; width: 4px; height: 4px"
    document.body.appendChild(rest)
  }
  await userEvent.hover(page.elementLocator(rest))
}
