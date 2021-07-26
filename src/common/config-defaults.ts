import { DeepReadonly } from "vue"
import { NodeLabelDirection, Configs } from "./configs"
import { SimpleLayout } from "../layouts/simple"
import cloneDeep from "lodash-es/cloneDeep"

export const CONFIGS_DEFAULT: DeepReadonly<Configs> = {
  view: {
    scalingObjects: false,
    panEnabled: true,
    zoomEnabled: true,
    minZoomLevel: 0.1,
    maxZoomLevel: 64,
    layoutHandler: new SimpleLayout(),
    onSvgPanZoomInitialized: undefined,
  },
  node: {
    shape: {
      type: "circle",
      radius: 16,
      stroke: null,
      color: "#4466cc",
    },
    hover: {
      type: "circle",
      radius: 16,
      stroke: null,
      color: "#3355bb",
    },
    selected: undefined,
    label: {
      visible: true,
      fontFamily: undefined,
      fontSize: 11,
      color: "#000000",
      margin: 4,
      direction: NodeLabelDirection.SOUTH,
      text: "name",
    },
    draggable: true,
    selectable: false,
    focusring: {
      visible: true,
      width: 4,
      padding: 3,
      color: "#eebb00",
    },
  },
  edge: {
    stroke: {
      width: 2,
      color: "#4466cc",
      dasharray: "0",
      linecap: "butt",
    },
    hover: {
      width: 2,
      color: "#3355bb",
      dasharray: "0",
      linecap: "butt",
    },
    gap: 3,
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
        stroke: {
          width: 1,
          color: "#4466cc",
        },
      },
      line: {
        width: 4,
        color: "#4466cc",
      },
    },
    selectable: false,
    selected: {
      width: 3,
      color: "#dd8800",
      dasharray: "3 5",
      linecap: "round",
    },
  },
}

export function cloneAllConfigDefaults(): Configs {
  return cloneDeep(CONFIGS_DEFAULT) as Configs
}
