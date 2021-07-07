import { Emitter } from "mitt"
import { Events, Links, NodePositions } from "../common/types"

export interface LayoutHandler {
  activate(layouts: NodePositions, links: Links, emitter: Emitter<Events>): void
  deactivate(): void
}
