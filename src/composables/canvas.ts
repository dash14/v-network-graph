import type { Emitter } from "mitt"
import type { Ref } from "vue"
import { computed, ref, watch } from "vue"
import { nonNull } from "@/common/common"
import { Configs, ViewConfig } from "@/common/configs"
import { Events } from "@/common/types"
import { provideContainers } from "@/composables/container"
import { useSvgPanZoom } from "@/composables/svg-pan-zoom"
import { provideZoomLevel } from "@/composables/zoom"
import { SvgPanZoomInstance } from "@/modules/svg-pan-zoom-ex"

export enum CanvasState {
  INITIAL = 0,
  LOADED = 1,
  UNLOADED = 2,
}

/**
 * Make the SVG canvas of a graph, panned and zoomed by svg-pan-zoom.
 * @param zoomLevel the zoom level, bound to the prop
 * @param initialZoomLevel the zoom level to apply once svg-pan-zoom is ready
 * @param configs the configs of the graph
 * @param emitter the event emitter of the graph
 * @returns the elements to bind in the template, the svg-pan-zoom instance and its state
 */
export function useGraphCanvas(
  zoomLevel: Ref<number>,
  initialZoomLevel: () => number,
  configs: Configs,
  emitter: Emitter<Events>
) {
  const container = ref<HTMLDivElement>()
  const svg = ref<SVGElement & SVGSVGElement>()
  const viewport = ref<SVGGElement>()
  const state = ref<CanvasState>(CanvasState.INITIAL)
  const show = computed(() => state.value !== CanvasState.INITIAL)

  // SVG pan / zoom
  const { svgPanZoom, onSvgPanZoomMounted, onSvgPanZoomUnmounted } = useSvgPanZoom(svg, {
    viewportSelector: ".v-ng-viewport",
    minZoom: configs.view.minZoomLevel, // temporary
    maxZoom: configs.view.maxZoomLevel, // temporary
    dblClickZoomEnabled: isDoubleClickZoomEnabled(configs.view),
    mouseWheelZoomEnabled: isMouseWheelZoomEnabled(configs.view),
    fit: configs.view.autoPanAndZoomOnLoad === "fit-content",
    center: configs.view.autoPanAndZoomOnLoad !== false,
    zoomEnabled: configs.view.zoomEnabled,
    preventMouseEventsDefault: false,
    // Called back as svg-pan-zoom pans and zooms, never after it is destroyed.
    onZoom: _ => {
      const z = nonNull(svgPanZoom.value, "svg-pan-zoom instance").getRealZoom()
      if (Math.abs(zoomLevel.value - z) >= 1.0e-6) {
        zoomLevel.value = z
        emitter.emit("view:zoom", z)
      }
    },
    panEnabled: configs.view.panEnabled,
    onPan: p => emitter.emit("view:pan", p),
  })

  provideContainers({ container, svg, viewport, svgPanZoom })

  // Observe container resizing
  const rectSize = { width: 0, height: 0 }
  // Observes the container only while svg-pan-zoom exists.
  // Server-side rendering has no ResizeObserver.
  const resizeObserver = globalThis.ResizeObserver
    ? new ResizeObserver(([entry]) => {
        const instance = nonNull(svgPanZoom.value, "svg-pan-zoom instance")
        instance.resize()
        const r = entry.target.getBoundingClientRect()
        if (configs.view.autoPanOnResize) {
          // Pan to keep the view area centered
          const x = -(rectSize.width - r.width) / 2
          const y = -(rectSize.height - r.height) / 2
          instance.panBy({ x, y })
        }
        const { width, height } = r
        if (rectSize.width !== width || rectSize.height !== height) {
          Object.assign(rectSize, { width, height })
          emitter.emit("view:resize", { x: r.x, y: r.y, width, height })
        }
      })
    : undefined
  onSvgPanZoomMounted(() => {
    const c = nonNull(container.value, "svg-pan-zoom container")
    resizeObserver?.observe(c)
    const instance = nonNull(svgPanZoom.value, "svg-pan-zoom instance")
    // The configs may have changed while svg-pan-zoom waited for the container to get a size.
    // The user's callback runs after these, so that what it switches stays.
    instance.setPanEnabled(configs.view.panEnabled)
    applyZoomEnabled(
      instance,
      configs.view.zoomEnabled,
      configs.view.doubleClickZoomEnabled,
      configs.view.mouseWheelZoomEnabled
    )
    configs.view.onSvgPanZoomInitialized?.(instance)
    const r = c.getBoundingClientRect()
    const { width, height } = r
    Object.assign(rectSize, { width, height })
    viewport.value?.addEventListener("touchstart", stopEventPropagation, { passive: false })
  })
  onSvgPanZoomUnmounted(() => {
    resizeObserver?.disconnect()
    viewport.value?.removeEventListener("touchstart", stopEventPropagation)
  })

  const applyAbsoluteZoomLevel = (absoluteZoomLevel: number) => {
    svgPanZoom.value?.applyAbsoluteZoomLevel(
      absoluteZoomLevel,
      configs.view.minZoomLevel,
      configs.view.maxZoomLevel
    )
  }

  watch(
    () => configs.view.panEnabled,
    v => {
      svgPanZoom.value?.setPanEnabled(v)
    }
  )
  watch(
    () => [
      configs.view.zoomEnabled,
      isDoubleClickZoomEnabled(configs.view),
      isMouseWheelZoomEnabled(configs.view),
    ],
    () => {
      const svgPanZoomInstance = svgPanZoom.value
      if (!svgPanZoomInstance) return
      applyZoomEnabled(
        svgPanZoomInstance,
        configs.view.zoomEnabled,
        configs.view.doubleClickZoomEnabled,
        configs.view.mouseWheelZoomEnabled
      )
    }
  )

  watch(zoomLevel, v => applyAbsoluteZoomLevel(v))
  watch(
    () => [configs.view.minZoomLevel, configs.view.maxZoomLevel],
    _ => {
      applyAbsoluteZoomLevel(zoomLevel.value)
    }
  )

  // Provide zoom level / scaling parameter
  const { scale } = provideZoomLevel(zoomLevel, configs.view)

  onSvgPanZoomMounted(() => {
    // apply initial zoom level
    applyAbsoluteZoomLevel(initialZoomLevel())
  })

  return {
    container,
    svg,
    viewport,
    state,
    show,
    svgPanZoom,
    onSvgPanZoomMounted,
    onSvgPanZoomUnmounted,
    applyAbsoluteZoomLevel,
    scale,
  }
}

export type GraphCanvas = ReturnType<typeof useGraphCanvas>

function applyZoomEnabled(
  svgPanZoom: SvgPanZoomInstance,
  enable: boolean,
  enableDblClick: boolean,
  enableMouseWheel: boolean
): void {
  svgPanZoom.setZoomEnabled(enable)
  if (enable && enableDblClick) {
    svgPanZoom.enableDblClickZoom()
  } else {
    svgPanZoom.disableDblClickZoom()
  }
  if (enable && enableMouseWheel) {
    svgPanZoom.enableMouseWheelZoom()
  } else {
    svgPanZoom.disableMouseWheelZoom()
  }
}

function isDoubleClickZoomEnabled(view: ViewConfig): boolean {
  return view.zoomEnabled && view.doubleClickZoomEnabled
}

export function isMouseWheelZoomEnabled(view: ViewConfig): boolean {
  return view.zoomEnabled && view.mouseWheelZoomEnabled
}

function stopEventPropagation(event: Event) {
  event.stopPropagation()
}
