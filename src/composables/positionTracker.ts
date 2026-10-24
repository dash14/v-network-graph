import { Ref, shallowRef, toRaw, triggerRef, watchEffect } from "vue"
import { Reactive } from "@/common/common"
import { Layouts, Nodes } from "@/common/types"
import { drawnCoordinateOf } from "@/modules/node/position"

interface TrackedPosition {
  x: number
  y: number
  givenX: unknown
  givenY: unknown
  fixed: boolean | undefined
}

/**
 * Follow the positions of all the nodes in one effect, since a layout tick moves them all.
 * @param layouts the layouts the graph draws
 * @param nodes the nodes
 * @param onMove called with the nodes drawn somewhere else than before, also on the first run
 * @returns a ref triggered on every change of the layouts after the first run
 */
export function trackNodePositions(
  layouts: Reactive<Layouts>,
  nodes: Ref<Nodes>,
  onMove: (moved: Set<string>) => void
): Ref<void> {
  const changed = shallowRef<void>()
  const tracked = new Map<string, TrackedPosition>()
  let isFirstRun = true

  watchEffect(() => {
    const positions = layouts.nodes
    const moved = new Set<string>()
    let isChanged = false
    let count = 0
    for (const id in positions) {
      count++
      // Taken out once, since a layout tick reads every position.
      const p = positions[id]
      const givenX: unknown = p?.x
      const givenY: unknown = p?.y
      const x = drawnCoordinateOf(givenX)
      const y = drawnCoordinateOf(givenY)
      const fixed = p?.fixed
      const last = tracked.get(id)
      // The given values too, since a change drawn the same is still a change of the layouts.
      if (
        last &&
        Object.is(last.givenX, givenX) &&
        Object.is(last.givenY, givenY) &&
        last.fixed === fixed
      ) {
        continue
      }
      if (last?.x !== x || last?.y !== y) moved.add(id)
      tracked.set(id, { x, y, givenX, givenY, fixed })
      isChanged = true
    }
    // Every id seen is in the map, so a larger map holds removed positions.
    if (tracked.size > count) {
      const rawPositions = toRaw(positions)
      tracked.forEach((_, id) => {
        if (id in rawPositions) return
        tracked.delete(id)
        isChanged = true
        // A node can stay without a position, and is then drawn at the origin. A removed one is
        // left as it is, since it may still be leaving with a transition.
        if (id in toRaw(nodes.value)) moved.add(id)
      })
    }
    if (moved.size > 0) onMove(moved)
    if (isChanged && !isFirstRun) triggerRef(changed)
    isFirstRun = false
  })

  return changed
}
