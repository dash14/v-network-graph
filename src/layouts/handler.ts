import { Emitter } from "mitt"
import { Ref } from "vue"
import { Reactive } from "@/common/common"
import { Configs } from "@/common/configs"
import { Events, Edges, NodePositions, Nodes } from "@/common/types"
import { SvgPanZoomInstance } from "@/modules/svg-pan-zoom-ex"

export interface LayoutActivateParameters {
  layouts: Reactive<NodePositions> // deprecated.
  // Unable to track objects in `layouts.nodes` when rewriting reference.

  nodePositions: Ref<NodePositions>
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
