import { Ref } from "@vue/reactivity"
import { Position } from "../common/types"
import { SimpleLayout } from "./simple"

const DEFAULT_GRID = 10

export type GridLayoutParameters = {
  grid?: number
}

export class GridLayout extends SimpleLayout {
  constructor(private options: GridLayoutParameters = {}) {
    super()
  }

  protected setNodePosition(nodeLayout: Ref<Position>, pos: Position) {
    const grid = this.options.grid || DEFAULT_GRID
    nodeLayout.value.x = Math.floor(pos.x / grid) * grid
    nodeLayout.value.y = Math.floor(pos.y / grid) * grid
  }
}
