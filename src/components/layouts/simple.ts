import { toRef } from "@vue/reactivity"
import { watch } from "@vue/runtime-core"
import { NodePositions, OnDragHandler } from "@/common/types"
import { getNodeSize, areNodesCollision } from "@/common/utility"
import { LayoutActivateParameters, LayoutHandler } from "./handler"

const NEW_NODE_POSITION_MARGIN = 20

export class SimpleLayout implements LayoutHandler {
  private onDeactivate?: () => void

  activate(parameters: LayoutActivateParameters): void {
    const { layouts, nodes, styles, emitter, svgPanZoom, zoomLevel } = parameters
    const onDrag: OnDragHandler = positions => {
      for (const [id, pos] of Object.entries(positions)) {
        const layout = this.getOrCreateNodePosition(layouts, id)
        layout.value.x = pos.x
        layout.value.y = pos.y
      }
    }

    const stopNodeWatch = watch(
      () => Object.keys(nodes),
      (nodeIds) => {
        if (!svgPanZoom.value) return
        // decide new node's position
        const newNodes = nodeIds.filter(n => !(n in layouts))
        const area = svgPanZoom.value.getViewArea()
        const scale = styles.view.resizeWithZooming ? 1 : zoomLevel.value
        for (const nodeId of newNodes) {
          const node = nodes[nodeId]
          const nodeSize = getNodeSize(node, styles.node, scale)
          const candidate = { ...area.center }
          for (;;) {
            let collision = false
            for (const [id, pos] of Object.entries(layouts)) {
              if (nodeId === id) continue
              const targetNode = nodes[id]
              if (!targetNode) continue
              const targetNodeSize = getNodeSize(targetNode, styles.node, scale)
              collision = areNodesCollision(candidate, nodeSize, pos, targetNodeSize)
              if (collision) {
                break
              }
            }
            if (collision) { // shift to new position
              candidate.x += nodeSize.width + NEW_NODE_POSITION_MARGIN / scale
              if (candidate.x + nodeSize.width / 2 > area.box.right) {
                candidate.x = area.center.x
                candidate.y += nodeSize.height + NEW_NODE_POSITION_MARGIN / scale
              }
            } else {
              break
            }
          }
          const layout = this.getOrCreateNodePosition(layouts, nodeId)
          layout.value.x = candidate.x
          layout.value.y = candidate.y
        }
      }
    )
    emitter.on("node:dragstart", onDrag)
    emitter.on("node:mousemove", onDrag)
    emitter.on("node:dragend", onDrag)

    this.onDeactivate = () => {
      stopNodeWatch()
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
