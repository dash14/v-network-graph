import type { Ref } from "vue"
import { inject, InjectionKey, provide, shallowRef, toRaw, triggerRef } from "vue"
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
  /** Triggered when the nodes are drawn ahead of the layouts, for what follows them as they move. */
  readonly drawn: Readonly<Ref<void>>
}

export interface CurrentPositionsWithDrawer extends CurrentPositions {
  /** Take the positions from the given function wherever it has one, ahead of the layouts. */
  drawAhead(positionOf: PositionOf): void
}

const injectionKey = Symbol("currentPositions") as InjectionKey<CurrentPositions>

export function provideCurrentPositions(layouts: Layouts): CurrentPositionsWithDrawer {
  let ahead: PositionOf | undefined
  const drawn = shallowRef<void>()
  const of = (id: string) => ahead?.(id) ?? untrackedPositionOf(toRaw(layouts).nodes, id)
  const current: CurrentPositionsWithDrawer = {
    of,
    all: () => {
      const nodes = toRaw(layouts).nodes
      if (!ahead) return nodes
      return Object.fromEntries(Object.keys(nodes).map(id => [id, { ...nodes[id], ...of(id) }]))
    },
    drawn,
    drawAhead: positionOf => {
      ahead = positionOf
      triggerRef(drawn)
    },
  }
  provide(injectionKey, current)
  return current
}

export function useCurrentPositions() {
  return nonNull(inject(injectionKey), "CurrentPositions")
}
