import { inject, InjectionKey, provide, shallowRef, toRaw, triggerRef, watch } from "vue"
import { nonNull } from "@/common/common"
import { Layouts, NodePositions, Position } from "@/common/types"
import type { PositionOf } from "@/layouts/handler"
import { untrackedPositionOf } from "@/modules/node/position"

/**
 * Where the nodes are now. A layout can draw them ahead of the layouts, which then follow only to
 * tell the user, so the graph reads the positions from here rather than from the layouts.
 */
export interface CurrentPositions {
  /** The position of a node, read untracked. */
  of(id: string): Position
  /** The positions of the nodes in the layouts, read untracked. */
  all(): Readonly<NodePositions>
  /**
   * Listen for the nodes drawn ahead of the layouts, for what follows them as they move. Not
   * reactive, as every node moves on each draw.
   * @returns the function to stop listening
   */
  onDrawn(listener: () => void): () => void
  /**
   * Listen for the nodes moved in the layouts, called untracked before the graph renders.
   * @returns the function to stop listening
   */
  onMoved(listener: (ids: ReadonlySet<string>) => void): () => void
}

export interface UpdatableCurrentPositions extends CurrentPositions {
  /** Take the positions from the given function wherever it has one, ahead of the layouts. */
  drawAhead(positionOf: PositionOf): void
  /** Stop taking the positions ahead of the layouts. */
  endAhead(): void
  /** Tell of the nodes moved in the layouts. */
  moved(ids: ReadonlySet<string>): void
}

const injectionKey = Symbol("currentPositions") as InjectionKey<CurrentPositions>

export function provideCurrentPositions(layouts: Layouts): UpdatableCurrentPositions {
  let ahead: PositionOf | undefined
  const listeners = new Set<() => void>()
  const movedListeners = new Set<(ids: ReadonlySet<string>) => void>()
  // Told from inside the tracking of the layouts, and passed on from a watch callback, so that
  // what the listeners read is not tracked there.
  let movedIds = new Set<string>()
  const movedTrigger = shallowRef<void>()
  watch(movedTrigger, () => {
    const ids = movedIds
    movedIds = new Set()
    movedListeners.forEach(listener => listener(ids))
  })
  const of = (id: string) => ahead?.(id) ?? untrackedPositionOf(toRaw(layouts).nodes, id)
  const current: UpdatableCurrentPositions = {
    of,
    all: () => {
      const nodes = toRaw(layouts).nodes
      if (!ahead) return nodes
      return Object.fromEntries(Object.keys(nodes).map(id => [id, { ...nodes[id], ...of(id) }]))
    },
    onDrawn: listener => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    onMoved: listener => {
      movedListeners.add(listener)
      return () => movedListeners.delete(listener)
    },
    moved: ids => {
      ids.forEach(id => movedIds.add(id))
      triggerRef(movedTrigger)
    },
    drawAhead: positionOf => {
      ahead = positionOf
      listeners.forEach(listener => listener())
    },
    endAhead: () => (ahead = undefined),
  }
  provide(injectionKey, current)
  return current
}

export function useCurrentPositions() {
  return nonNull(inject(injectionKey), "CurrentPositions")
}
