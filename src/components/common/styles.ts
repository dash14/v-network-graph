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

export interface ViewStyle {
  resizeWithZooming: boolean
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
  label: NodeLabelStyle
  selectable: boolean
  selection: NodeSelectionStyle
}

/* Link style */

export interface LinkStyle {
  stroke: StrokeStyle
  gap: number
  summarized: {
    label: LabelStyle
    shape: ShapeStyle
    line: StrokeStyle
  }
  selectable: boolean
  selected: StrokeStyle
}

export interface Styles {
  view: ViewStyle
  node: NodeStyle
  link: LinkStyle
}

/** ユーザ指定用 optionalな指定のためのinterface */
// export type UserStyles = { [P in keyof Styles]?: Partial<Styles[P]> }
export type UserStyles = RecursivePartial<Styles>
