import type { Ref } from "vue"
import { ref, onMounted, onUnmounted } from "vue"
import { nonNull } from "@/common/common"
import type {
  CustomEventOptions,
  SvgPanZoomInstance,
  SvgPanZoomOptions,
} from "@/modules/svg-pan-zoom-ex"
import { createSvgPanZoomEx } from "@/modules/svg-pan-zoom-ex"

type Callback = () => void

export interface UseSvgPanZoomReturn {
  svgPanZoom: Ref<SvgPanZoomInstance | undefined>
  onSvgPanZoomMounted: (callback: Callback) => void
  onSvgPanZoomUnmounted: (callback: Callback) => void
}

export function useSvgPanZoom(
  svg: Ref<SVGSVGElement | undefined>,
  options: SvgPanZoomOptions
): UseSvgPanZoomReturn {
  const instance = ref<SvgPanZoomInstance>()
  const mountedCallbacks: Callback[] = []
  const unmountedCallbacks: Callback[] = []

  const instanceMounted = () => {
    mountedCallbacks.forEach(c => c())
    mountedCallbacks.length = 0 // clear
  }

  const instanceUnmounted = () => {
    unmountedCallbacks.forEach(c => c())
    unmountedCallbacks.length = 0 // clear
  }

  onMounted(() => {
    const element = nonNull(svg.value, "<svg>")
    // hook init/destroy custom events
    const userInit = options.customEventsHandler?.init ?? ((_: any) => {})
    const userDestroy = options.customEventsHandler?.destroy ?? ((_: any) => {})
    const haltEventListeners = options.customEventsHandler?.haltEventListeners ?? []

    const exOptions = {
      ...options,
      customEventsHandler: {
        init: (o: CustomEventOptions) => {
          instance.value = o.instance
          userInit(o)
          instanceMounted()
        },
        destroy: (o: CustomEventOptions) => {
          instanceUnmounted()
          userDestroy(o)
        },
        haltEventListeners,
      },
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
        createSvgPanZoomEx(element, exOptions)
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

  // Called in setup, before svg-pan-zoom is made in onMounted.
  const onSvgPanZoomMounted = (callback: Callback) => mountedCallbacks.push(callback)
  const onSvgPanZoomUnmounted = (callback: Callback) => unmountedCallbacks.push(callback)

  return { svgPanZoom: instance, onSvgPanZoomMounted, onSvgPanZoomUnmounted }
}
