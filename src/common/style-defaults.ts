import { NodeLabelDirection, Styles } from "./styles"

export const STYLE_DEFAULT: Styles = {
  view: {
    resizeWithZooming: false,
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
    label: {
      fontFamily: undefined,
      fontSize: 11,
      color: "#000000",
      margin: 4,
      direction: NodeLabelDirection.SOUTH,
    },
    draggable: true,
    selectable: false,
    selection: {
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
    selectable: true,
    selected: {
      width: 3,
      color: "#dd8800",
      dasharray: "3 5",
      linecap: "round",
    },
  },
}
