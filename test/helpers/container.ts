import { h, VNode } from "vue"

export const WIDTH = 600
export const HEIGHT = 400

/** Wraps the graph in a container of a fixed size. */
export function inContainer(child: VNode) {
  return h("div", { style: { width: `${WIDTH}px`, height: `${HEIGHT}px` } }, [child])
}
