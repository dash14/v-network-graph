import svgPanZoom, * as SvgPanZoom from "svg-pan-zoom"

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
  getRealZoom(): number
  applyAbsoluteZoomLevel(zoomLevel: number, minZoomLevel: number, maxZoomLevel: number): void
  setPanEnabled(enabled: boolean): SvgPanZoomInstance
  setZoomEnabled(enabled: boolean): SvgPanZoomInstance
}

export interface CustomEventOptions {
  svgElement: SVGSVGElement;
  instance: SvgPanZoomInstance;
}

export interface CustomEventHandler {
  init: (options: CustomEventOptions) => void;
  haltEventListeners: string[];
  destroy: (options: CustomEventOptions) => void;
}

export interface SvgPanZoomOptions extends Omit<SvgPanZoom.Options, "customEventsHandler"> {
  customEventsHandler?: CustomEventHandler; // (default null)
}

export interface SvgPanZoomInternal extends SvgPanZoomInstance {
  _isPanEnabled: boolean
  _isZoomEnabled: boolean
  _internalIsPanEnabled(): boolean
  _internalEnablePan(): void
  _internalDisablePan(): void
  _internalIsZoomEnabled(): boolean
  _internalEnableZoom(): void
  _internalDisableZoom(): void
  _touchStartHandler: (event: TouchEvent) => void
  _touchEndHandler: (event: TouchEvent) => void
  _touchMoveHandler: (event: TouchEvent) => void
}

const methods: Partial<SvgPanZoomInternal> = {
  fitToContents(this: SvgPanZoomInternal) {
    this.fit()
      .center()
      .zoomOut() // 2段階ズームアウトしたサイズとする
      .zoomOut()
    return this
  },
  getViewArea(this: SvgPanZoomInternal) {
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
  },
  getRealZoom(this: SvgPanZoomInternal) {
    return this.getSizes().realZoom
  },
  applyAbsoluteZoomLevel(this: SvgPanZoomInternal, zoomLevel: number, minZoomLevel: number, maxZoomLevel: number) {
    const realZoom = this.getRealZoom()
    const relativeZoom = this.getZoom()
    const originalZoom = realZoom / relativeZoom

    this.setMinZoom(minZoomLevel / originalZoom)
      .setMaxZoom(maxZoomLevel / originalZoom)
      .zoom(zoomLevel / originalZoom)
  },
  isPanEnabled(this: SvgPanZoomInternal) {
    return this._isPanEnabled
  },
  enablePan(this: SvgPanZoomInternal) {
    this._isPanEnabled = true
    this._internalEnablePan()
    return this
  },
  disablePan(this: SvgPanZoomInternal) {
    this._isPanEnabled = false
    this._internalDisablePan()
    return this
  },
  isZoomEnabled(this: SvgPanZoomInternal) {
    return this._isZoomEnabled
  },
  enableZoom(this: SvgPanZoomInternal) {
    this._isZoomEnabled = true
    this._internalEnableZoom()
    return this
  },
  disableZoom(this: SvgPanZoomInternal) {
    this._isZoomEnabled = false
    this._internalDisableZoom()
    return this
  },
  setPanEnabled(this: SvgPanZoomInternal, enabled: boolean) {
    if (enabled) {
      this.enablePan()
    } else {
      this.disablePan()
    }
    return this
  },
  setZoomEnabled(this: SvgPanZoomInternal, enabled: boolean) {
    if (enabled) {
      this.enableZoom()
    } else {
      this.disableZoom()
    }
    return this
  },
}

function constructor(
  svgPanZoom: SvgPanZoom.Instance,
  options: SvgPanZoomOptions,
  svg: SVGElement
): SvgPanZoomInternal {
  const instance = svgPanZoom as SvgPanZoomInternal
  instance._isPanEnabled = options.panEnabled ?? true
  instance._isZoomEnabled = options?.zoomEnabled ?? true
  instance._internalIsPanEnabled = instance.isPanEnabled
  instance._internalEnablePan = instance.enablePan
  instance._internalDisablePan = instance.disablePan
  instance._internalIsZoomEnabled = instance.isZoomEnabled
  instance._internalEnableZoom = instance.enableZoom
  instance._internalDisableZoom = instance.disableZoom
  Object.assign(svgPanZoom, methods)

  createTouchEventHandlers(instance, svg)
  svg.addEventListener("touchstart", instance._touchStartHandler)
  return instance
}

function destructor(svgPanZoom: SvgPanZoomInternal, svg: SVGElement) {
  const instance = svgPanZoom as SvgPanZoomInternal
  svg.removeEventListener("touchstart", instance._touchStartHandler)
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

function createTouchEventHandlers(instance: SvgPanZoomInternal, svg: SVGElement) {
  // for zooming with pinch-in/out
  let basePosition: SvgPanZoom.Point = { x: 0, y: 0 }
  let baseCenter: SvgPanZoom.Point = { x: 0, y: 0 }
  let baseDistance = 0
  let baseZoomLevel = 0

  instance._touchStartHandler = (event) => {
    const that = instance
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
      svg.addEventListener("touchmove", instance._touchMoveHandler)
      svg.addEventListener("touchend", instance._touchEndHandler)
      svg.addEventListener("touchcancel", instance._touchEndHandler)
      event.preventDefault()
      event.stopPropagation()
    }
  }
  instance._touchEndHandler = (event) => {
    const that = instance
    if (event.touches.length <= 1) {
      if (that._isPanEnabled && !that._internalIsPanEnabled()) {
        that._internalEnablePan()
      }
      if (that._isZoomEnabled && !that._internalIsZoomEnabled()) {
        that._internalEnableZoom()
      }
      svg.removeEventListener("touchmove", instance._touchMoveHandler)
      svg.removeEventListener("touchend", instance._touchEndHandler)
      svg.removeEventListener("touchcancel", instance._touchEndHandler)
      event.preventDefault()
      event.stopPropagation()
      if (that._isPanEnabled && event.touches.length == 1) {
        // single touch -> continue panning by svg-pan-zoom
        const pe = new PointerEvent('pointerdown', {
          clientX: event.touches[0].clientX,
          clientY: event.touches[0].clientY,
        })
        svg.dispatchEvent(pe)
      }
    }
  }
  instance._touchMoveHandler = (event) => {
    const that = instance
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
      const element = svg as SVGGraphicsElement & SVGSVGElement
      const inversedScreenCTM = element.getScreenCTM()?.inverse()
      const point = element.createSVGPoint()
      point.x = center.x
      point.y = center.y
      const relativeTouchPoint = point.matrixTransform(inversedScreenCTM)
      that.zoomAtPoint(baseZoomLevel * scale, relativeTouchPoint)
    }
  }
}

export function createSvgPanZoomEx(
  svg: SVGElement,
  options: SvgPanZoomOptions
): SvgPanZoomInstance {

  const userInit = options.customEventsHandler?.init ?? ((_: any) => {})
  const userDestroy = options.customEventsHandler?.destroy ?? ((_: any) => {})
  const haltEventListeners = options.customEventsHandler?.haltEventListeners ?? []

  options.customEventsHandler = {
    init: o => {
      constructor(o.instance, options, o.svgElement)
      userInit(o)
    },
    destroy: o => {
      userDestroy(o)
      destructor(o.instance as SvgPanZoomInternal, o.svgElement)
    },
    haltEventListeners
  }

  return svgPanZoom(svg, options as SvgPanZoom.Options) as SvgPanZoomInternal
}
