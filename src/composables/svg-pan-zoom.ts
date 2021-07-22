import { ref, Ref, onMounted, onUnmounted } from "vue"
import svgPanZoom, * as SvgPanZoom from "svg-pan-zoom"
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
  _isPanEnabled: boolean
  _isZoomEnabled: boolean
  _internalIsPanEnabled(): boolean
  _internalEnablePan(): void
  _internalDisablePan(): void
  _internalIsZoomEnabled(): boolean
  _internalEnableZoom(): void
  _internalDisableZoom(): void
}

function enhanceInstance(svgPanZoom: SvgPanZoom.Instance, options?: SvgPanZoom.Options): SvgPanZoomInstance {
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

  instance._isPanEnabled = options?.panEnabled ?? true
  instance._isZoomEnabled = options?.zoomEnabled ?? true
  instance._internalIsPanEnabled = instance.isPanEnabled
  instance._internalEnablePan = instance.enablePan
  instance._internalDisablePan = instance.disablePan
  instance._internalIsZoomEnabled = instance.isZoomEnabled
  instance._internalEnableZoom = instance.enableZoom
  instance._internalDisableZoom = instance.disableZoom

  instance.isPanEnabled = function () {
    return instance._isPanEnabled
  }
  instance.enablePan = function () {
    instance._isPanEnabled = true
    instance._internalEnablePan()
    return instance
  }
  instance.disablePan = function () {
    instance._isPanEnabled = false
    instance._internalDisablePan()
    return instance
  }
  instance.isZoomEnabled = function () {
    return instance._isZoomEnabled
  }
  instance.enableZoom = function () {
    instance._isZoomEnabled = true
    instance._internalEnableZoom()
    return instance
  }
  instance.disableZoom = function () {
    instance._isZoomEnabled = false
    instance._internalDisableZoom()
    return instance
  }
  return instance
}

function touchDistance(t1: Touch, t2: Touch): number {
  const dx = t2.clientX - t1.clientX
  const dy = t2.clientY - t1.clientY
  return Math.sqrt(dx * dx + dy * dy)
}

function touchCenter(t1: Touch, t2: Touch): SvgPanZoom.Point {
  return {
    x: (t1.clientX + t2.clientX) / 2,
    y: (t1.clientY + t2.clientY) / 2
  }
}

export function useSvgPanZoom(svg: Ref<SVGElement | undefined>, options?: SvgPanZoom.Options) {
  const instance = ref<SvgPanZoomInstance>()
  let state = State.INITIAL
  const mountedCallbacks: Callback[] = []
  const unmountedCallbacks: Callback[] = []

  // for zooming with pinch-in/out
  let basePosition: SvgPanZoom.Point = { x: 0, y: 0 }
  let baseCenter: SvgPanZoom.Point = { x: 0, y: 0 }
  let baseDistance = 0
  let baseZoomLevel = 0

  function touchMoveHandler(event: TouchEvent) {
    const that = nonNull(instance.value, "SvgPanZoom instance")
    if (!that._isZoomEnabled) return
    if (event.touches.length < 2) return
    const touch1 = event.touches[0]
    const touch2 = event.touches[1]
    const center = touchCenter(touch1, touch2)
    if (that._isPanEnabled) {
      const dx = center.x - baseCenter.x
      const dy = center.y - baseCenter.y
      that.pan({
        x: basePosition.x + dx,
        y: basePosition.y + dy
      })
    }
    if (that._isZoomEnabled) {
      const distance = touchDistance(touch1, touch2)
      const scale = distance / baseDistance
      const element = nonNull(svg.value, "SVG element") as SVGGraphicsElement & SVGSVGElement
      const inversedScreenCTM = element.getScreenCTM()?.inverse()
      const point = element.createSVGPoint()
      point.x = center.x
      point.y = center.y
      const relativeTouchPoint = point.matrixTransform(inversedScreenCTM)
      that.zoomAtPoint(baseZoomLevel * scale, relativeTouchPoint)
    }
  }

  function touchStartHandler(event: TouchEvent) {
    const that = nonNull(instance.value, "SvgPanZoom instance")
    if (!that._isPanEnabled && !that._isZoomEnabled) return
    if (event.touches.length >= 2) {
      if (that._isPanEnabled && that._internalIsPanEnabled()) {
        that._internalDisablePan()
      }
      if (that._isZoomEnabled && that._internalIsZoomEnabled()) {
        that._internalDisableZoom()
      }
      const touch1 = event.touches[0]
      const touch2 = event.touches[1]
      basePosition = that.getPan()
      baseCenter = touchCenter(touch1, touch2)
      baseDistance = touchDistance(touch1, touch2)
      baseZoomLevel = that.getZoom()
      svg.value?.addEventListener("touchmove", touchMoveHandler)
      svg.value?.addEventListener("touchend", touchEndHandler)
      event.preventDefault()
      event.stopPropagation()
    }
  }

  function touchEndHandler(event: TouchEvent) {
    const that = nonNull(instance.value, "SvgPanZoom instance")
    if (event.touches.length <= 1) {
      if (that._isPanEnabled && !that._internalIsPanEnabled()) {
        that._internalEnablePan()
      }
      if (that._isZoomEnabled && !that._internalIsZoomEnabled()) {
        that._internalEnableZoom()
      }
      svg.value?.removeEventListener("touchmove", touchMoveHandler)
      svg.value?.removeEventListener("touchend", touchEndHandler)
      event.preventDefault()
      event.stopPropagation()
      if (that._isPanEnabled && event.touches.length == 1) {
        // single touch -> continue panning by svg-pan-zoom
        const pe = new PointerEvent('pointerdown', {
          clientX: event.touches[0].clientX,
          clientY: event.touches[0].clientY,
        })
        svg.value?.dispatchEvent(pe)
      }
    }
  }

  const instanceMounted = () => {
    state = State.MOUNTED
    svg.value?.addEventListener("touchstart", touchStartHandler)
    mountedCallbacks.forEach(c => c())
    mountedCallbacks.length = 0 // clear
  }

  const instanceUnmounted = () => {
    state = State.UNMOUNTED
    svg.value?.removeEventListener("touchstart", touchStartHandler)
    unmountedCallbacks.forEach(c => c())
    unmountedCallbacks.length = 0 // clear
  }

  onMounted(() => {
    const element = nonNull(svg.value, "<svg>")
    // hook init/destroy custom events
    if (options?.customEventsHandler) {
      const userInit = options.customEventsHandler.init
      const userDestroy = options.customEventsHandler.destroy
      options.customEventsHandler.init = (o) => {
        instance.value = enhanceInstance(o.instance, options)
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
          instance.value = enhanceInstance(o.instance, options)
          instanceMounted()
        },
        haltEventListeners: [],
        destroy: () => instanceUnmounted()
      }
    }

    svgPanZoom(element, options)
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
