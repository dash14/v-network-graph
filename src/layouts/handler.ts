import { Ref } from "vue"
import { Emitter } from "mitt"
import { Events, Edges, NodePositions, Nodes, Reactive } from "../common/types"
import { Styles } from "../common/styles"
import { SvgPanZoomInstance } from "src/utility/svg-pan-zoom-ex"

export interface LayoutActivateParameters {
  layouts: Reactive<NodePositions>
  nodes: Readonly<Nodes>
  edges: Readonly<Edges>
  styles: Readonly<Styles>
  scale: Readonly<Ref<number>>
  emitter: Emitter<Events>
  svgPanZoom: SvgPanZoomInstance
}

export interface LayoutHandler {
  activate(parameters: LayoutActivateParameters): void
  deactivate(): void
}
