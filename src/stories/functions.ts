import { ref } from "vue"
import { provideZoomLevel } from "@/composables/zoom"
import { useSvgPanZoom } from "@/composables/svg-pan-zoom"
import { LabelStyle, SimpleLayout, StrokeStyle, ViewConfig } from ".."

export function wrapSvg(element: string, className?: string): string {
  if (!className) {
    className = "story-full"
  }
  const classAttrs = `class="${className}" `
  return `
    <svg ${classAttrs} ref="svg">
      <g class="viewport">
        ${element}
      </g>
    </svg>`
}

export function setupSvg() {
  const svg = ref<SVGElement & SVGSVGElement>()
  useSvgPanZoom(svg, {
    viewportSelector: ".viewport",
    minZoom: 0.1,
    maxZoom: 10.0,
    dblClickZoomEnabled: false,
    mouseWheelZoomEnabled: false,
    fit: false,
    center: false,
    zoomEnabled: false,
    preventMouseEventsDefault: false,
    panEnabled: true,
  })

  provideScale()

  return { svg }
}

export function provideScale() {
  const zoomLevel = ref(1.0)
  provideZoomLevel(zoomLevel, viewConfigWithDefaults({ scalingObjects: false }))
}

function configWithDefaults<T extends object>(defaultValues: T, assign: Partial<T>): T {
  return Object.assign({ ...defaultValues }, assign)
}

function viewConfigWithDefaults(config: Partial<ViewConfig> = {}): ViewConfig {
  return configWithDefaults(
    {
      scalingObjects: false,
      panEnabled: true,
      zoomEnabled: true,
      minZoomLevel: 0.1,
      maxZoomLevel: 64,
      doubleClickZoomEnabled: true,
      mouseWheelZoomEnabled: true,
      boxSelectionEnabled: false,
      autoPanAndZoomOnLoad: "center-content",
      autoPanOnResize: true,
      layoutHandler: new SimpleLayout(),
      onSvgPanZoomInitialized: undefined,
      grid: {
        visible: false,
        interval: 10,
        thickIncrements: 5,
        line: {
          color: "#e0e0e0",
          width: 1,
          dasharray: 1,
        },
        thick: {
          color: "#cccccc",
          width: 1,
          dasharray: 0,
        },
      },
      selection: {
        box: {
          color: "#0000ff20",
          strokeWidth: 1,
          strokeColor: "#aaaaff",
          strokeDasharray: 0,
        },
        detector: (event: KeyboardEvent) => {
          const detect = /Mac OS/.test(navigator.userAgent) ? event.metaKey : event.ctrlKey
          return event.type === "keydown" ? detect : !detect
        },
      },
      builtInLayerOrder: [],
    },
    config
  )
}

export function strokeStyleWithDefaults(style: Partial<StrokeStyle> = {}): StrokeStyle {
  return configWithDefaults(
    {
      width: 1,
      color: "#000",
      dasharray: "0",
      linecap: "butt",
      animate: false,
      animationSpeed: 40,
    },
    style
  )
}

export function labelStyleWithDefaults(style: Partial<LabelStyle> = {}): LabelStyle {
  return configWithDefaults(
    {
      fontFamily: undefined,
      fontSize: 11,
      lineHeight: 1.1,
      color: "#000000",
      background: undefined,
    },
    style
  )
}
