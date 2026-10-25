import type { Emitter } from "mitt"
import type { Ref } from "vue"
import { nextTick, watch } from "vue"
import { nonNull } from "@/common/common"
import { Configs } from "@/common/configs"
import { Events, Nodes } from "@/common/types"
import { LayoutActivateParameters } from "@/layouts/handler"
import { asyncNextTick } from "@/modules/vue/nextTick"
import { isPromise } from "@/utils/object"
import { CanvasState, GraphCanvas } from "./canvas"
import type { ViewMethods } from "./viewMethods"

/**
 * Activate the layout handler and show the graph once svg-pan-zoom is ready, panned and zoomed as
 * configured.
 * @param canvas the canvas of the graph
 * @param view the view methods of the graph
 * @param nodes the nodes
 * @param configs the configs of the graph
 * @param emitter the event emitter of the graph
 * @param activateParams makes the parameters to activate a layout handler with
 */
export function useGraphLoading(
  canvas: GraphCanvas,
  view: ViewMethods,
  nodes: Ref<Nodes>,
  configs: Configs,
  emitter: Emitter<Events>,
  activateParams: () => LayoutActivateParameters
) {
  const { state, onSvgPanZoomMounted, onSvgPanZoomUnmounted, svgPanZoom } = canvas
  const { updateBorderBox, fitToContents, panToCenter } = view

  watch(
    () => configs.view.layoutHandler,
    (newHandler, oldHandler) => {
      oldHandler.deactivate()
      newHandler.activate(activateParams())
    }
  )

  onSvgPanZoomMounted(async () => {
    // Wait promise for network loading
    if (configs.view.onBeforeInitialDisplay) {
      const promise = configs.view.onBeforeInitialDisplay()
      if (isPromise(promise)) {
        await promise
      }
    }

    // pan to center
    const svg = nonNull(svgPanZoom.value, "svg-pan-zoom")

    // activate layout handler.
    // (calc the positions of nodes whose positions are not specified)
    configs.view.layoutHandler.activate(activateParams())

    // Wait for applying network/layout changes such as nodes, layouts, etc.
    // by onBeforeInitialDisplay/LayoutHandler
    await asyncNextTick()

    const autoPanAndZoom = configs.view.autoPanAndZoomOnLoad
    if (configs.view.fit || autoPanAndZoom !== false) {
      const nodesEmpty = Object.keys(nodes.value).length == 0
      const pan1 = svg.getPan()
      if (nodesEmpty || autoPanAndZoom === "center-zero") {
        await updateBorderBox()
        // Pan (0, 0) to the center.
        const sizes = svg.getSizes()
        svg.pan({
          x: sizes.width / 2,
          y: sizes.height / 2,
        })
      } else if (autoPanAndZoom === "fit-content" || configs.view.fit) {
        await fitToContents()
      } else if (autoPanAndZoom === "center-content") {
        await panToCenter()
      } else {
        await updateBorderBox()
      }

      // If the pan position does not change, the onPan event of svg-pan-zoom
      // is not fired, but v-network-graph always fires the `view:pan` event
      // when initialized.
      nextTick(() => {
        const pan2 = svg.getPan()
        if (pan1.x === pan2.x && pan1.y === pan2.y) {
          emitter.emit("view:pan", pan2)
        }
      })
    } else {
      await updateBorderBox()
    }

    emitter.emit("view:load")

    // start displaying the svg
    state.value = CanvasState.LOADED
  })

  onSvgPanZoomUnmounted(() => {
    state.value = CanvasState.UNLOADED
    emitter.emit("view:unload")
    configs.view.layoutHandler.deactivate()
  })
}
