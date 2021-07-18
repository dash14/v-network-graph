import { ref, Ref, onMounted, onUnmounted } from "vue"
import * as SvgPanZoom from "../external/svg-pan-zoom-types"
import { nonNull } from "../common/types"

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

type Callback = () => void

enum State {
  INITIAL = 0,
  MOUNTED = 1,
  UNMOUNTED = 2
}

export interface SvgPanZoomInstance extends SvgPanZoom.Instance {
  fitToContents(): SvgPanZoomInstance
  getViewArea(): ViewArea
  getRealZoom(): number
  applyAbsoluteZoomLevel(zoomLevel: number, minZoomLevel: number, maxZoomLevel: number): void
}

function enhanceInstance(svgPanZoom: SvgPanZoom.Instance): SvgPanZoomInstance {
  const instance = svgPanZoom as SvgPanZoomInstance
  instance.fitToContents = function () {
    this.fit()
      .center()
      .zoomOut() // 2段階ズームアウトしたサイズとする
      .zoomOut()
    return this
  }
  instance.getViewArea = function () {
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
  instance.getRealZoom = function () {
    return this.getSizes().realZoom
  }
  instance.applyAbsoluteZoomLevel = function (
    zoomLevel: number,
    minZoomLevel: number,
    maxZoomLevel: number
  ) {
    const realZoom = this.getRealZoom()
    const relativeZoom = this.getZoom()
    const originalZoom = realZoom / relativeZoom

    this.setMinZoom(minZoomLevel / originalZoom)
      .setMaxZoom(maxZoomLevel / originalZoom)
      .zoom(zoomLevel / originalZoom)
  }
  return instance
}

export function useSvgPanZoom(svg: Ref<SVGElement | undefined>, options?: SvgPanZoom.Options) {
  const instance = ref<SvgPanZoomInstance>()
  let state = State.INITIAL
  const mountedCallbacks: Callback[] = []
  const unmountedCallbacks: Callback[] = []

  const instanceMounted = () => {
    state = State.MOUNTED
    mountedCallbacks.forEach(c => c())
    mountedCallbacks.length = 0 // clear
  }

  const instanceUnmounted = () => {
    state = State.UNMOUNTED
    unmountedCallbacks.forEach(c => c())
    unmountedCallbacks.length = 0 // clear
  }

  onMounted(async () => {
    const svgPanZoom = (await import("svg-pan-zoom")).default

    // hook init/destroy custom events
    if (options?.customEventsHandler) {
      const userInit = options.customEventsHandler.init
      const userDestroy = options.customEventsHandler.destroy
      options.customEventsHandler.init = (o) => {
        instance.value = enhanceInstance(o.instance)
        userInit(o)
        instanceMounted()
      }
      options.customEventsHandler.destroy = () => {
        instanceUnmounted()
        userDestroy()
      }
    } else {
      options ??= {}
      options.customEventsHandler ??= {
        init: (o) => {
          instance.value = enhanceInstance(o.instance)
          instanceMounted()
        },
        haltEventListeners: [],
        destroy: () => instanceUnmounted()
      }
    }

    svgPanZoom(nonNull(svg.value, "<svg>"), options) as SvgPanZoomInstance
  })

  onUnmounted(() => {
    instance.value?.destroy()
  })

  const onSvgPanZoomMounted = (callback: Callback) => {
    if (state === State.INITIAL) {
      mountedCallbacks.push(callback)
    } else if (state === State.MOUNTED) {
      callback()
    }
  }

  const onSvgPanZoomUnmounted = (callback: Callback) => {
    if (state === State.INITIAL || state === State.MOUNTED) {
      unmountedCallbacks.push(callback)
    } else {
      callback()
    }
  }

  return { svgPanZoom: instance, onSvgPanZoomMounted, onSvgPanZoomUnmounted }
}
