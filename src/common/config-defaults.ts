import { NodeLabelDirection, Configs, withSelf, Config, UserConfigs } from "./configs"
import { SimpleLayout } from "../layouts/simple"
import merge from "lodash-es/merge"

export function getConfigDefaults(): Configs {
  return {
    view: {
      scalingObjects: false,
      panEnabled: true,
      zoomEnabled: true,
      minZoomLevel: 0.1,
      maxZoomLevel: 64,
      layoutHandler: new SimpleLayout(),
      onSvgPanZoomInitialized: undefined,
    },
    node: withSelf(self => ({
      normal: {
        type: "circle",
        radius: 16,
        color: "#4466cc",
        strokeWidth: 0,
        strokeColor: "#000000",
        strokeDasharray: "0",
      },
      hover: {
        type: (node) => Config.value(self.normal.type, node) as any,
        radius: (node) => Config.value(self.normal.radius, node) ?? 0 + 2,
        width: (node) => Config.value(self.normal.width, node) ?? 0 + 2,
        height: (node) => Config.value(self.normal.height, node) ?? 0 + 2,
        borderRadius: (node) => Config.value(self.normal.borderRadius, node) ?? 0,
        strokeWidth: (node) => Config.value(self.normal.strokeWidth, node),
        strokeColor: (node) => Config.value(self.normal.strokeColor, node),
        strokeDasharray: (node) => Config.value(self.normal.strokeDasharray, node),
        color: "#3355bb",
      },
      selected: undefined,
      draggable: true,
      selectable: false,
      label: {
        visible: true,
        fontFamily: undefined,
        fontSize: 11,
        color: "#000000",
        margin: 4,
        direction: NodeLabelDirection.SOUTH,
        text: "name",
      },
      focusring: {
        visible: true,
        width: 4,
        padding: 3,
        color: "#eebb00",
      },
    })),
    edge: withSelf(self => ({
      normal: {
        width: 2,
        color: "#4466cc",
        dasharray: "0",
        linecap: "butt",
      },
      hover: {
        width: (edge) => Config.value(self.normal.width, edge) + 1,
        color: "#3355bb",
        dasharray: (edge) => Config.value(self.normal.dasharray, edge),
        linecap: (edge) => Config.value(self.normal.linecap, edge),
      },
      selected: {
        width: (edge) => Config.value(self.normal.width, edge) + 1,
        color: "#dd8800",
        dasharray: (edge) => {
          const w = Config.value(self.normal.width, edge)
          return `${w * 1.5} ${w * 2}`
        },
        linecap: "round",
      },
      selectable: false,
      gap: 3,
      summarize: true,
      summarized: {
        label: {
          fontSize: 10,
          color: "#4466cc",
        },
        shape: {
          type: "rect",
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
        },
      },
    })),
  }
}

export function getFullConfigs(config?: UserConfigs) {
  const configs = getConfigDefaults()
  if (config) {
    merge(configs, config)
  }
  return configs
}
