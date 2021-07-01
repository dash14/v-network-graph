import { NodeLabelDirection, Styles } from "../common/types"

export const STYLE_DEFAULT: Styles = {
  node: {
    width: 32,
    color: "#4466cc",
    resizeWithZooming: false,
  },
  nodeLabel: {
    fontFamily: undefined,
    fontSize: 10,
    color: "#000000",
    margin: 4,
    direction: NodeLabelDirection.SOUTH,
  },
  nodeSelection: {
    width: 4,
    padding: 3,
    color: "#cccc0088",
  },
  link: {
    width: 1,
    gap: 3,
    color: "#4466cc",
    selectable: true,
    strokeDasharray: "0",
  },
}
