import type { Emitter } from "mitt"
import type { Ref } from "vue"
import { computed } from "vue"
import { Configs } from "@/common/configs"
import { Events } from "@/common/types"
import { SvgPanZoomInstance } from "@/modules/svg-pan-zoom-ex"

/**
 * Follow what the pointers are doing on the graph, to switch the pan and the zoom.
 * @param svgPanZoom the svg-pan-zoom instance
 * @param configs the configs of the graph
 * @param emitter the event emitter of the graph
 * @returns whether the graph handles touches
 */
export function useViewMode(
  svgPanZoom: Ref<SvgPanZoomInstance | undefined>,
  configs: Configs,
  emitter: Emitter<Events>
) {
  emitter.on("view:mode", mode => {
    // avoid pan/zoom when using nodes and edges with multi-touch
    if (configs.view.panEnabled) {
      if (mode === "default") {
        svgPanZoom.value?.enablePan()
      } else {
        svgPanZoom.value?.disablePan()
      }
    }
    if (configs.view.zoomEnabled) {
      if (mode === "default") {
        svgPanZoom.value?.enableZoom()
      } else {
        svgPanZoom.value?.disableZoom()
      }
    }
  })

  const touches = computed(() => {
    return configs.view.panEnabled || configs.view.zoomEnabled || configs.node.draggable
  })

  return { touches }
}
