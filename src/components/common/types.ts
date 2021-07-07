
/** レイヤ位置 */
export enum NtLayerPos {
  BACKGROUND = "background",
  PATHS = "paths",
  NOTIFICATIONS = "notifications",
}

/** マウスモード */
export enum MouseMode {
  NORMAL = "normal",
  RANGE_SELECTION = "range-selection",
}

/** ノード */
export interface Node {
  name?: string
  type?: string
  // 任意の内容
}

/** ノード群 */
export type Nodes = { [name: string]: Node }

/* リンク */
export interface Link {
  source: string
  target: string
}

/* リンク群 */
export type Links = { [name: string]: Link }

/* ------------------------------------------ *
 * Utility
 * ------------------------------------------ */

type RecursivePartial<T> = {
  [P in keyof T]?: RecursivePartial<T[P]>;
};

/* ------------------------------------------ *
 * Layouts
 * ------------------------------------------ */

export interface Position {
  x: number
  y: number
}

interface FixablePosition extends Position {
  fixed?: boolean
}

export type NodePositions = { [name: string]: FixablePosition }

export interface Layouts {
  nodes: NodePositions
}
/** ユーザ指定用 optionalな指定のためのinterface */
export type UserLayouts = RecursivePartial<Layouts>

/* ------------------------------------------ *
 * Events
 * ------------------------------------------ */

export type NodeMouseEvent = { node: string, event: MouseEvent }

export type Events = {
  "node:click": NodeMouseEvent,
  "node:mouseup": NodeMouseEvent,
  "node:mousedown": NodeMouseEvent,
  "node:dragstart": { [name: string]: Position },
  "node:mousemove": { [name: string]: Position },
  "node:dragend": { [name: string]: Position },
  "node:select": string[],
  "view:zoom": number,
  "view:pan": { x: number, y: number },
  "view:fit": undefined,
}

export type EventHandler = <T extends keyof Events>(event : T, value: Events[T]) => void

/* ------------------------------------------ *
 * Styles
 * ------------------------------------------ */

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
    label: LabelStyle,
    shape: ShapeStyle,
    line: StrokeStyle
  }
  selectable: boolean
}

export interface Styles {
  view: ViewStyle
  node: NodeStyle
  link: LinkStyle
}

/** ユーザ指定用 optionalな指定のためのinterface */
// export type UserStyles = { [P in keyof Styles]?: Partial<Styles[P]> }
export type UserStyles = RecursivePartial<Styles>


/* ------------------------------------------ *
 * Type Utility
 * ------------------------------------------ */

export function nonNull<T>(val?: T): T {
  if (val === undefined || val === null) {
    throw new Error("Parameter is null")
  }
  return val
}
