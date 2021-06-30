import { ref, Ref } from "@vue/reactivity"
import { onMounted, onUnmounted } from "@vue/runtime-core"
import svgPanZoom from "svg-pan-zoom"

import "svg-pan-zoom" // 型情報の再利用のため

export interface SvgPanZoomInstance extends SvgPanZoom.Instance {
  fitToContents(): SvgPanZoomInstance
}

export function useSvgPanZoom(svg: Ref<SVGElement | undefined>, options?: SvgPanZoom.Options) {
  const instance = ref<SvgPanZoomInstance>()

  onMounted(() => {
    instance.value = svgPanZoom(svg.value as SVGElement, options) as SvgPanZoomInstance
    instance.value.fitToContents = function() {
      this.fit()
        .center()
        .zoomOut() // 2段階ズームアウトしたサイズとする
        .zoomOut()
      return this
    }
  })

  onUnmounted(() => {
    instance.value?.destroy()
  })

  return { svgPanZoom: instance }
}
