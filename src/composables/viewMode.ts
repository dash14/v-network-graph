import type { Emitter } from "mitt"
import type { Ref } from "vue"
import { computed, ref } from "vue"
import { Configs } from "@/common/configs"
import { Events } from "@/common/types"
import { SvgPanZoomInstance } from "@/modules/svg-pan-zoom-ex"

/**
 * Follow what the pointers are doing on the graph, to switch the pan and the zoom and the cursor.
 * @param svgPanZoom the svg-pan-zoom instance
 * @param configs the configs of the graph
 * @param emitter the event emitter of the graph
 * @returns whether a node is being dragged, and whether the graph handles touches
 */
export function useViewMode(
  svgPanZoom: Ref<SvgPanZoomInstance | undefined>,
  configs: Configs,
  emitter: Emitter<Events>
) {
  // mouse pointer change on dragging
  const dragging = ref<boolean>(false)
  emitter.on("node:dragstart", _ => (dragging.value = true))
  emitter.on("node:dragend", _ => (dragging.value = false))
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

  return { dragging, touches }
}
