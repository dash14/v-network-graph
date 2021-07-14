import { Ref, toRef, watch } from "vue"
import { NodePositions, OnDragHandler, Position } from "../common/types"
import { getNodeSize, areNodesCollision } from "../common/utility"
import { LayoutActivateParameters, LayoutHandler } from "./handler"

const NEW_NODE_POSITION_MARGIN = 20

export class SimpleLayout implements LayoutHandler {
  private onDeactivate?: () => void

  activate(parameters: LayoutActivateParameters): void {
    const { layouts, nodes, styles, emitter, scale, svgPanZoom } = parameters
    const onDrag: OnDragHandler = positions => {
      for (const [id, pos] of Object.entries(positions)) {
        const layout = this.getOrCreateNodePosition(layouts, id)
        this.setNodePosition(layout, pos)
      }
    }

    const setNewNodePositions = (nodeIds: string[]) => {
      // decide new node's position
      const newNodes = nodeIds.filter(n => !(n in layouts))
      const area = svgPanZoom.getViewArea()
      const s = scale.value
      for (const nodeId of newNodes) {
        const node = nodes[nodeId]
        const nodeSize = getNodeSize(node, styles.node, s)
        const candidate = { ...area.center }
        for (;;) {
          let collision = false
          for (const [id, pos] of Object.entries(layouts)) {
            if (nodeId === id) continue
            const targetNode = nodes[id]
            if (!targetNode) continue
            const targetNodeSize = getNodeSize(targetNode, styles.node, s)
            collision = areNodesCollision(candidate, nodeSize, pos, targetNodeSize)
            if (collision) {
              break
            }
          }
          if (collision) {
            // Slide the width of one node + margin in the horizontal direction.
            // If it reaches the edge of the display area, it moves downward.
            candidate.x += nodeSize.width + NEW_NODE_POSITION_MARGIN / s
            if (candidate.x + nodeSize.width / 2 > area.box.right) {
              candidate.x = area.center.x
              candidate.y += nodeSize.height + NEW_NODE_POSITION_MARGIN / s
            }
          } else {
            break
          }
        }
        const layout = this.getOrCreateNodePosition(layouts, nodeId)
        this.setNodePosition(layout, candidate)
      }
    }

    setNewNodePositions(Object.keys(nodes))
    const stopNodeWatch = watch(() => Object.keys(nodes), setNewNodePositions)

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

  protected setNodePosition(nodeLayout: Ref<Position>, pos: Position) {
    nodeLayout.value.x = pos.x
    nodeLayout.value.y = pos.y
  }

  private getOrCreateNodePosition(layouts: NodePositions, node: string) {
    const layout = toRef(layouts, node)
    if (!layout.value) {
      layout.value = { x: 0, y: 0 }
    }
    return layout
  }
}
