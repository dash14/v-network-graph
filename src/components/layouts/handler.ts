import { Emitter } from "mitt"
import { Events, Links, NodePositions, Nodes } from "../common/types"

export interface LayoutHandler {
  activate(layouts: NodePositions, nodes: Nodes, links: Links, emitter: Emitter<Events>): void
  deactivate(): void
}
