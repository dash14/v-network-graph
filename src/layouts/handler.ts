import { SvgPanZoomInstance } from "@/composables/svg-pan-zoom"
import { Ref } from "@vue/reactivity"
import { Emitter } from "mitt"
import { Events, Links, NodePositions, Nodes, Reactive } from "@/common/types"
import { Styles } from "@/common/styles"

export interface LayoutActivateParameters {
  layouts: Reactive<NodePositions>
  nodes: Readonly<Nodes>
  links: Readonly<Links>
  styles: Readonly<Styles>
  scale: Readonly<Ref<number>>
  emitter: Emitter<Events>
  svgPanZoom: SvgPanZoomInstance
}

export interface LayoutHandler {
  activate(parameters: LayoutActivateParameters): void
  deactivate(): void
}
