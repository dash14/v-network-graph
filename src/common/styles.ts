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
}

/* Node style */

export enum NodeLabelDirection {
  NORTH = 0,
  NORTH_EAST = 1,
  EAST = 2,
  SOUTH_EAST = 3,
  SOUTH = 4,
  SOUTH_WEST = 5,
  WEST = 6,
  NORTH_WEST = 7,
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

export interface NodeStyle {
  shape: ShapeStyle
  hover: ShapeStyle
  label: NodeLabelStyle
  draggable: boolean
  selectable: boolean
  selection: NodeSelectionStyle
}

/* Edge style */

export interface EdgeStyle {
  stroke: StrokeStyle
  hover: StrokeStyle
  gap: number
  summarized: {
    label: LabelStyle
    shape: ShapeStyle
    line: StrokeStyle
  }
  selectable: boolean
  selected: StrokeStyle
}

export interface Configs {
  view: ViewConfig
  node: NodeStyle
  edge: EdgeStyle
}

/** ユーザ指定用 optionalな指定のためのinterface */
export type UserConfigs = RecursivePartial<Configs>
