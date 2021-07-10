import { ref, Ref } from "@vue/reactivity"
import { onMounted, onUnmounted } from "@vue/runtime-core"
import svgPanZoom from "svg-pan-zoom"

import "svg-pan-zoom" // 型情報の再利用のため

interface Box {
  top: number
  bottom: number
  left: number
  right: number
}

interface ViewArea {
  box: Box
  center: SvgPanZoom.Point
}

export interface SvgPanZoomInstance extends SvgPanZoom.Instance {
  fitToContents(): SvgPanZoomInstance
  getViewArea(): ViewArea
  applyAbsoluteZoomLevel(zoomLevel: number, minZoomLevel: number, maxZoomLevel: number): void
}

export function useSvgPanZoom(svg: Ref<SVGElement | undefined>, options?: SvgPanZoom.Options) {
  const instance = ref<SvgPanZoomInstance>()

  onMounted(() => {
    instance.value = svgPanZoom(svg.value as SVGElement, options) as SvgPanZoomInstance
    instance.value.fitToContents = function () {
      this.fit()
        .center()
        .zoomOut() // 2段階ズームアウトしたサイズとする
        .zoomOut()
      return this
    }
    instance.value.getViewArea = function () {
      const sizes = this.getSizes()
      const pan = this.getPan()
      const scale = sizes.realZoom
      pan.x /= scale
      pan.y /= scale
      const viewport = {
        width: sizes.width / scale,
        height: sizes.height / scale,
      }
      return {
        box: {
          top: -pan.y,
          bottom: viewport.height - pan.y,
          left: -pan.x,
          right: viewport.width - pan.x,
        },
        center: {
          x: viewport.width / 2 - pan.x,
          y: viewport.height / 2 - pan.y,
        },
      }
    }
    instance.value.applyAbsoluteZoomLevel = function (
      zoomLevel: number,
      minZoomLevel: number,
      maxZoomLevel: number
    ) {
      const realZoom = this.getSizes().realZoom
      const relativeZoom = this.getZoom()
      const originalZoom = realZoom / relativeZoom

      this.setMinZoom(minZoomLevel / originalZoom)
        .setMaxZoom(maxZoomLevel / originalZoom)
        .zoom(zoomLevel / originalZoom)
    }
  })

  onUnmounted(() => {
    instance.value?.destroy()
  })

  return { svgPanZoom: instance }
}
