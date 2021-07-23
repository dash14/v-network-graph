import { SvgPanZoomInstance } from "../utility/svg-pan-zoom-ex"
import { RecursivePartial } from "./types"

/* Shape style */

export interface StrokeStyle {
  width: number
  color: string
  dasharray?: string
  linecap?: "butt" | "round" | "square"
}

export interface ShapeStyleBase {
  stroke?: StrokeStyle | null
  color: string
}

export interface CircleShapeStyle extends ShapeStyleBase {
  type: "circle"
  radius: number
}

export interface RectangleShapeStyle extends ShapeStyleBase {
  type: "rect"
  width: number
  height: number
  borderRadius: number
}

export type ShapeStyle = CircleShapeStyle | RectangleShapeStyle

/* Label style */

export interface LabelStyle {
  fontFamily?: string
  fontSize: number
  color: string
}

export interface ViewConfig {
  resizeWithZooming: boolean
  panEnabled: true
  zoomEnabled: true
  minZoomLevel: number
  maxZoomLevel: number
  onSvgPanZoomInitialized?: (instance: SvgPanZoomInstance) => void
}

/* Node style */

export enum NodeLabelDirection {
  CENTER = 0,
  NORTH = 1,
  NORTH_EAST = 2,
  EAST = 3,
  SOUTH_EAST = 4,
  SOUTH = 5,
  SOUTH_WEST = 6,
  WEST = 7,
  NORTH_WEST = 8,
}

export interface NodeLabelStyle extends LabelStyle {
  margin: number
  direction: NodeLabelDirection
}

export interface NodeSelectionStyle {
  width: number
  padding: number
  color: string
}

export interface NodeConfig {
  shape: ShapeStyle
  hover: ShapeStyle
  label: NodeLabelStyle
  draggable: boolean
  selectable: boolean | number
  selection: NodeSelectionStyle
}

/* Edge style */

export interface EdgeConfig {
  stroke: StrokeStyle
  hover: StrokeStyle
  gap: number
  summarized: {
    label: LabelStyle
    shape: ShapeStyle
    line: StrokeStyle
  }
  selectable: boolean | number
  selected: StrokeStyle
}

export interface Configs {
  view: ViewConfig
  node: NodeConfig
  edge: EdgeConfig
}

/** ユーザ指定用 optionalな指定のためのinterface */
export type UserConfigs = RecursivePartial<Configs>
