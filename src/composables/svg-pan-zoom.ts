import { ref, Ref, onMounted, onUnmounted } from "vue"
import { nonNull } from "../common/common"
import { createSvgPanZoomEx, SvgPanZoomInstance, SvgPanZoomOptions } from "../utility/svg-pan-zoom-ex"

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

    createSvgPanZoomEx(element, options)
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
