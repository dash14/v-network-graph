import { Ref } from "vue"
import { Emitter } from "mitt"
import { Reactive } from "@/common/common"
import { Events, Edges, NodePositions, Nodes } from "@/common/types"
import { Configs } from "@/common/configs"
import { SvgPanZoomInstance } from "@/modules/svg-pan-zoom-ex"

export interface LayoutActivateParameters {
  layouts: Reactive<NodePositions>
  nodes: Ref<Nodes>
  edges: Ref<Edges>
  configs: Readonly<Configs>
  scale: Readonly<Ref<number>>
  emitter: Emitter<Events>
  svgPanZoom: SvgPanZoomInstance
}

export interface LayoutHandler {
  activate(parameters: LayoutActivateParameters): void
  deactivate(): void
}
