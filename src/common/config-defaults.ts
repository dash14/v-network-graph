import merge from "lodash-es/merge"
import { reactive } from "vue"
import { SimpleLayout } from "../layouts/simple"
import { Config, Configs, NodeLabelDirection, UserConfigs, withSelf } from "./configs"
import { Edge, Edges, Node, Path } from "./types"

/**
 * Get all default configs.
 * @returns configs
 */
export function getConfigDefaults(): Configs {
  return {
    view: {
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
    },
    node: withSelf(self => ({
      normal: {
        type: "circle",
        radius: 16,
        // for rect -->
        width: 32,
        height: 32,
        borderRadius: 4,
        // <-- for rect
        color: "#4466cc",
        strokeWidth: 0,
        strokeColor: "#000000",
        strokeDasharray: 0,
      },
      hover: {
        type: node => Config.value(self.normal.type, node) as any,
        radius: node => (Config.value(self.normal.radius, node) ?? 0) + 2,
        width: node => (Config.value(self.normal.width, node) ?? 0) + 2,
        height: node => (Config.value(self.normal.height, node) ?? 0) + 2,
        borderRadius: node => Config.value(self.normal.borderRadius, node) ?? 0,
        strokeWidth: node => Config.value(self.normal.strokeWidth, node),
        strokeColor: node => Config.value(self.normal.strokeColor, node),
        strokeDasharray: node => Config.value(self.normal.strokeDasharray, node),
        color: "#3355bb",
      },
      selected: undefined,
      draggable: true,
      selectable: false,
      label: {
        visible: true,
        fontFamily: undefined,
        fontSize: 11,
        lineHeight: 1.1,
        color: "#000000",
        background: undefined,
        // background: {
        //   visible: true,
        //   color: "#ffffff",
        //   padding: {
        //     vertical: 1,
        //     horizontal: 4,
        //   },
        //   borderRadius: 2
        // },
        margin: 4,
        direction: NodeLabelDirection.SOUTH,
        text: "name",
        handleNodeEvents: true,
      },
      focusring: {
        visible: true,
        width: 4,
        padding: 3,
        color: "#eebb00",
      },
      zOrder: {
        enabled: false,
        zIndex: 0,
        bringToFrontOnHover: true,
        bringToFrontOnSelected: true,
      },
      transition: undefined,
    })),
    edge: withSelf(self => ({
      normal: {
        width: 2,
        color: "#4466cc",
        dasharray: 0,
        linecap: "butt",
        animate: false,
        animationSpeed: 50,
      },
      hover: {
        width: edge => Config.value(self.normal.width, edge) + 1,
        color: "#3355bb",
        dasharray: edge => Config.value(self.normal.dasharray, edge),
        linecap: edge => Config.value(self.normal.linecap, edge),
        animate: edge => Config.value(self.normal.animate, edge),
        animationSpeed: edge => Config.value(self.normal.animationSpeed, edge),
      },
      selected: {
        width: edge => Config.value(self.normal.width, edge) + 1,
        color: "#dd8800",
        dasharray: edge => {
          const w = Config.value(self.normal.width, edge)
          return `${w * 1.5} ${w * 2}`
        },
        linecap: edge => Config.value(self.normal.linecap, edge),
        animate: edge => Config.value(self.normal.animate, edge),
        animationSpeed: edge => Config.value(self.normal.animationSpeed, edge),
      },
      selectable: false,
      gap: 3,
      type: "straight",
      marker: {
        source: {
          type: "none",
          width: 5,
          height: 5,
          margin: -1,
          units: "strokeWidth",
          color: null,
        },
        target: {
          type: "none",
          width: 5,
          height: 5,
          margin: -1,
          units: "strokeWidth",
          color: null,
        },
      },
      margin: null,
      summarize: (_edges: Edges, configs: Configs) => {
        return configs.edge.type == "curve" ? false : null
      },
      summarized: {
        label: {
          fontSize: 10,
          lineHeight: 1,
          color: "#4466cc",
        },
        shape: {
          type: "rect",
          // for circle -->
          radius: 6,
          // <-- for circle
          width: 12,
          height: 12,
          borderRadius: 3,
          color: "#ffffff",
          strokeWidth: 1,
          strokeColor: "#4466cc",
          strokeDasharray: undefined,
        },
        stroke: {
          width: 5,
          color: "#4466cc",
          dasharray: undefined,
          linecap: undefined,
          animate: false,
          animationSpeed: 50,
        },
      },
      selfLoop: {
        radius: 12,
        isClockwise: true,
        offset: 10,
        angle: 270,
      },
      keepOrder: "clock",
      label: {
        fontFamily: undefined,
        fontSize: 11,
        lineHeight: 1.1,
        color: "#000000",
        background: undefined,
        // background: {
        //   visible: true,
        //   color: "#ffffff",
        //   padding: {
        //     vertical: 1,
        //     horizontal: 4,
        //   },
        //   borderRadius: 2
        // },
        margin: 4,
        padding: 4,
      },
      zOrder: {
        enabled: false,
        zIndex: 0,
        bringToFrontOnHover: true,
        bringToFrontOnSelected: true,
      },
    })),
    path: withSelf(self => ({
      visible: false,
      clickable: false,
      hoverable: false,
      curveInNode: false,
      end: "centerOfNode",
      margin: 0,
      // @Deprecated
      path: reactive({
        width: 6,
        color: p => {
          const list = [
            "#d5000088",
            "#c5116288",
            "#aa00ff88",
            "#6200ea88",
            "#304ffe88",
            "#2962ff88",
            "#0091ea88",
            "#00b8d488",
            "#00bfa588",
            "#00c85388",
            "#64dd1788",
            "#aeea0088",
            "#ffd60088",
            "#ffab0088",
            "#ff6d0088",
            "#dd2c0088",
          ]
          const hash = p.edges
            .map(s =>
              s.split("").reduce((a, b) => {
                a = (a << 5) - a + b.charCodeAt(0)
                return a & a
              }, 0)
            )
            .reduce((a, b) => a + b, 0)
          return list[Math.abs(hash) % list.length]
        },
        dasharray: undefined,
        linecap: "round",
        linejoin: "round",
        animate: false,
        animationSpeed: 50,
      }),
      normal: {
        width: path => Config.value(self.path.width, path),
        color: path => Config.value(self.path.color, path),
        dasharray: path => Config.value(self.path.dasharray, path),
        linecap: path => Config.value(self.path.linecap, path),
        linejoin: path => Config.value(self.path.linejoin, path),
        animate: path => Config.value(self.path.animate, path),
        animationSpeed: path => Config.value(self.path.animationSpeed, path),
      },
      hover: {
        width: path => Config.value(self.normal.width, path) + 2,
        color: path => Config.value(self.normal.color, path),
        dasharray: path => Config.value(self.normal.dasharray, path),
        linecap: path => Config.value(self.normal.linecap, path),
        linejoin: path => Config.value(self.normal.linejoin, path),
        animate: path => Config.value(self.normal.animate, path),
        animationSpeed: path => Config.value(self.normal.animationSpeed, path),
      },
      selected: {
        width: path => Config.value(self.normal.width, path) + 2,
        color: path => Config.value(self.normal.color, path),
        dasharray: "6 12",
        linecap: path => Config.value(self.normal.linecap, path),
        linejoin: path => Config.value(self.normal.linejoin, path),
        animate: path => Config.value(self.normal.animate, path),
        animationSpeed: path => Config.value(self.normal.animationSpeed, path),
      },
      selectable: false,
      zOrder: {
        enabled: false,
        zIndex: 0,
        bringToFrontOnHover: true,
        bringToFrontOnSelected: true,
      },
      transition: undefined,
    })),
  }
}

export function getFullConfigs<N extends Node = Node, E extends Edge = Edge, P extends Path = Path>(
  config?: UserConfigs<N, E, P>
): Configs {
  const configs = getConfigDefaults()
  if (config) {
    merge(configs, config)
  }
  return configs
}
