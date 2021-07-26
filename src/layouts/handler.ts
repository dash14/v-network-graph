import { Ref } from "vue"
import { Emitter } from "mitt"
import { Events, Edges, NodePositions, Nodes, Reactive } from "../common/types"
import { Configs } from "../common/configs"
import { SvgPanZoomInstance } from "../utility/svg-pan-zoom-ex"

export interface LayoutActivateParameters {
  layouts: Reactive<NodePositions>
  nodes: Readonly<Nodes>
  edges: Readonly<Edges>
  configs: Readonly<Configs>
  scale: Readonly<Ref<number>>
  emitter: Emitter<Events>
  svgPanZoom: SvgPanZoomInstance
}

export interface LayoutHandler {
  activate(parameters: LayoutActivateParameters): void
  deactivate(): void
}
