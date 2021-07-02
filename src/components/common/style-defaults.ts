import { NodeLabelDirection, Styles } from "../common/types"

export const STYLE_DEFAULT: Styles = {
  view: {
    resizeWithZooming: false,
  },
  node: {
    shape: {
      type: "circle",
      radius: 16,
      stroke: null,
      color: "#4466cc"
    },
    label: {
      fontFamily: undefined,
      fontSize: 10,
      color: "#000000",
      margin: 4,
      direction: NodeLabelDirection.SOUTH,
    },
    selectable: true,
    selection: {
      width: 4,
      padding: 3,
      color: "#cccc0088",
    },
  },
  link: {
    stroke: {
      width: 3,
      color: "#4466cc",
      dasharray: "0",
      linecap: "butt",
    },
    gap: 3,
    selectable: true,
  },
}
