import { SvgPanZoomInstance } from "@/composables/svg-pan-zoom"
import { Ref } from "@vue/reactivity"
import { Emitter } from "mitt"
import { Events, Links, NodePositions, Nodes } from "../common/types"

export interface LayoutActivateParameters {
  layouts: NodePositions
  nodes: Nodes
  links: Links
  emitter: Emitter<Events>
  svgPanZoom: Ref<SvgPanZoomInstance | undefined>
}

export interface LayoutHandler {
  activate(parameters: LayoutActivateParameters): void
  deactivate(): void
}
