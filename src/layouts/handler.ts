import { Emitter } from "mitt"
import { Ref } from "vue"
import { Reactive } from "@/common/common"
import { Configs } from "@/common/configs"
import { Events, Edges, NodePositions, Nodes, Position } from "@/common/types"
import { SvgPanZoomInstance } from "@/modules/svg-pan-zoom-ex"

export interface LayoutActivateParameters {
  layouts: Reactive<NodePositions> // deprecated.
  // Unable to track objects in `layouts.nodes` when rewriting reference.

  nodePositions: Ref<NodePositions>
  nodes: Ref<Nodes>
  edges: Ref<Edges>
  configs: Readonly<Configs>
  scale: Readonly<Ref<number>>
  emitter: Emitter<Events>
  svgPanZoom: SvgPanZoomInstance

  /** Given by a graph that can draw positions before they are in the layouts. */
  positionDrawer?: PositionDrawer
}

/** The position of a node, or undefined to draw it where the layouts have it. */
export type PositionOf = (node: string) => Position | undefined

/** Draws positions that are not in the layouts yet, so that a layout can update them less often. */
export interface PositionDrawer {
  /** The longest time in milliseconds that the layouts may stay behind what is drawn. */
  readonly interval: number
  /** Draw the nodes at the given positions, without updating the layouts. */
  draw(positionOf: PositionOf): void
  /**
   * Set the function that brings the layouts up to what is drawn, called before they are read.
   * @param flush the function, or undefined to clear it
   */
  setFlush(flush: (() => void) | undefined): void
}

export interface LayoutHandler {
  activate(parameters: LayoutActivateParameters): void
  deactivate(): void
}
