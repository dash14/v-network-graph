import type { Emitter } from "mitt"
import { expect, test, vi } from "vitest"
import { nextTick } from "vue"
import type { Events } from "@/index"
import { mountGraph } from "./helpers/graph"

// Keeps the emitters that the graphs make, to count the handlers on them.
const emitters = vi.hoisted(() => [] as Emitter<Events>[])
vi.mock("mitt", async original => {
  const { default: mitt } = await original<typeof import("mitt")>()
  return {
    default: (...args: Parameters<typeof mitt>) => {
      const emitter = mitt(...args)
      emitters.push(emitter as unknown as Emitter<Events>)
      return emitter
    },
  }
})

test("the grid leaves no handlers behind as it is hidden and shown again", async () => {
  const { state } = await mountGraph({
    nodes: { node1: {} },
    layouts: { nodes: { node1: { x: 0, y: 0 } } },
    configs: { view: { grid: { visible: true } } },
  })
  const emitter = emitters.at(-1)!
  const count = () =>
    (["view:resize", "view:pan", "view:zoom"] as const).map(
      type => emitter.all.get(type)?.length ?? 0
    )
  const shown = count()

  for (let i = 0; i < 3; i++) {
    state.configs.view.grid = { visible: false }
    await nextTick()
    state.configs.view.grid = { visible: true }
    await nextTick()
  }
  expect(count()).toEqual(shown)
})
