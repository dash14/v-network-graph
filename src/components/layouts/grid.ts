import { toRef } from "@vue/reactivity"
import { NodePositions, OnDragHandler } from "@/common/types"
import { LayoutActivateParameters, LayoutHandler } from "./handler"

const DEFAULT_GRID = 10

export type GridLayoutParameters = {
  grid?: number
}

export class GridLayout implements LayoutHandler {
  private onDeactivate?: () => void

  constructor(private options: GridLayoutParameters = {}) {}

  activate(parameters: LayoutActivateParameters): void {
    const { layouts, emitter } = parameters
    const onDrag: OnDragHandler = positions => {
      const grid = this.options.grid || DEFAULT_GRID
      for (const [id, pos] of Object.entries(positions)) {
        const layout = this.getOrCreateNodePosition(layouts, id)
        layout.value.x = Math.floor(pos.x / grid) * grid
        layout.value.y = Math.floor(pos.y / grid) * grid
      }
    }

    emitter.on("node:dragstart", onDrag)
    emitter.on("node:mousemove", onDrag)
    emitter.on("node:dragend", onDrag)

    this.onDeactivate = () => {
      emitter.off("node:dragstart", onDrag)
      emitter.off("node:mousemove", onDrag)
      emitter.off("node:dragend", onDrag)
    }
  }

  deactivate(): void {
    if (this.onDeactivate) {
      this.onDeactivate()
    }
  }

  private getOrCreateNodePosition(layouts: NodePositions, node: string) {
    const layout = toRef(layouts, node)
    if (!layout.value) {
      layout.value = { x: 0, y: 0 }
    }
    return layout
  }
}
