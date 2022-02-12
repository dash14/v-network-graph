import { ref, Ref, onMounted, onUnmounted } from "vue"
import { nonNull } from "@/common/common"
import { createSvgPanZoomEx, SvgPanZoomInstance, SvgPanZoomOptions } from "@/modules/svg-pan-zoom-ex"

type Callback = () => void

enum State {
  INITIAL = 0,
  MOUNTED = 1,
  UNMOUNTED = 2
}

export function useSvgPanZoom(svg: Ref<SVGSVGElement | undefined>, options: SvgPanZoomOptions) {
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

  onMounted(() => {
    const element = nonNull(svg.value, "<svg>")
    // hook init/destroy custom events
    const userInit = options.customEventsHandler?.init ?? ((_: any) => {})
    const userDestroy = options.customEventsHandler?.destroy ?? ((_: any) => {})
    const haltEventListeners = options.customEventsHandler?.haltEventListeners ?? []

    options.customEventsHandler = {
      init: o => {
        instance.value = o.instance
        userInit(o)
        instanceMounted()
      },
      destroy: o => {
        instanceUnmounted()
        userDestroy(o)
      },
      haltEventListeners
    }

    const initialize = () => {
      const rect = element.getBoundingClientRect()
      // In svg-pan-zoom, the shadow viewport is generated based with
      // size on initialization. At this time, if the width and height
      // are zero, an exception will occur during the calculation.
      // Therefore, initialization is performed after allocating the area.
      // Note that even after onMounted, the area is not allocated at
      // the time of page switching with Nuxt.
      if (rect.width !== 0 && rect.height !== 0) {
        createSvgPanZoomEx(element, options)
      } else {
        setTimeout(initialize, 200)
      }
    }
    initialize()
  })

  onUnmounted(() => {
    instance.value?.destroy()
    instance.value = undefined
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
