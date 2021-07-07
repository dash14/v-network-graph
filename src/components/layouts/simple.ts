import { Events, Links, NodePositions, Nodes, OnDragHandler } from "@/common/types"
import { toRef } from "@vue/reactivity"

import { Emitter } from "mitt"
import { LayoutHandler } from "./handler"

export class SimpleLayout implements LayoutHandler {
  private onDeactivate?: () => void

  activate(layouts: NodePositions, _nodes: Nodes, _links: Links, emitter: Emitter<Events>): void {
    const onDrag: OnDragHandler = positions => {
      for (const [id, pos] of Object.entries(positions)) {
        const layout = this.getOrCreateNodePosition(layouts, id)
        layout.value.x = pos.x
        layout.value.y = pos.y
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
