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
    // normalize
    const min = Math.min(0.0001, minZoomLevel)
    const max = Math.max(min, maxZoomLevel)
    const zoom = Math.max(Math.min(max, zoomLevel), min)

    const realZoom = this.getRealZoom()
    const relativeZoom = this.getZoom()
    const originalZoom = realZoom / relativeZoom

    this.setMinZoom(min / originalZoom)
      .setMaxZoom(max / originalZoom)
      .zoom(zoom / originalZoom)
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
      this.enableDblClickZoom()
    } else {
      this.disableZoom()
      this.disableDblClickZoom()
    }
    return this
  },
}

function constructor(
  svgPanZoom: SvgPanZoom.Instance,
  options: SvgPanZoomOptions,
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
  return instance
}

export function createSvgPanZoomEx(
  svg: SVGElement,
  options: SvgPanZoomOptions
): SvgPanZoomInstance {

  const userInit = options.customEventsHandler?.init ?? ((_: any) => {})
  const userDestroy = options.customEventsHandler?.destroy ?? ((_: any) => {})
  const haltEventListeners = options.customEventsHandler?.haltEventListeners ?? []

  if (options.mouseWheelZoomEnabled === undefined) {
    options.mouseWheelZoomEnabled = options.zoomEnabled
  }

  options.customEventsHandler = {
    init: o => {
      constructor(o.instance, options)
      userInit(o)
    },
    destroy: o => userDestroy(o),
    haltEventListeners
  }

  return svgPanZoom(svg, options as SvgPanZoom.Options) as SvgPanZoomInternal
}
