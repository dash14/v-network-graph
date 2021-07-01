
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
 * Layouts
 * ------------------------------------------ */

export interface Position {
  x: number
  y: number
}

export type NodePositions = { [name: string]: Position }

export interface Layouts {
  nodes: NodePositions
}
/** ユーザ指定用 optionalな指定のためのinterface */
export type UserLayouts = { [P in keyof Layouts]?: { [S in keyof Layouts[P]]?: Layouts[P][S] } }

/* ------------------------------------------ *
 * Events
 * ------------------------------------------ */

export type Events = {
  "node:click": string,
  "node:mouseup": string,
  "node:mousedown": string,
  "node:dragstart": string[],
  "node:mousemove": string[],
  "node:dragend": string[],
  "node:select": string[],
  "view:zoom": number,
  "view:pan": { x: number, y: number },
  "view:fit": undefined,
}

export type EventHandler = <T extends keyof Events>(event : T, value: Events[T]) => void

/* ------------------------------------------ *
 * Styles
 * ------------------------------------------ */

export interface ViewStyle {
  resizeWithZooming: boolean
}

/** ノードスタイル */
export interface NodeStyle {
  width: number
  height?: number
  color: string
  selectable: boolean
}

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

export interface NodeLabelStyle {
  fontFamily: string | undefined
  fontSize: number
  color: string
  margin: number
  direction: NodeLabelDirection
}

export interface NodeSelectionStyle {
  width: number
  padding: number
  color: string
}

export interface LinkStyle {
  width: number
  gap: number
  color: string
  selectable: boolean
  strokeDasharray: string
}

export interface Styles {
  view: ViewStyle
  node: NodeStyle
  nodeLabel: NodeLabelStyle
  nodeSelection: NodeSelectionStyle
  link: LinkStyle
}

/** ユーザ指定用 optionalな指定のためのinterface */
export type UserStyles = { [P in keyof Styles]?: { [S in keyof Styles[P]]?: Styles[P][S] } }

/* ------------------------------------------ *
 * Type Utility
 * ------------------------------------------ */

export function nonNull<T>(val?: T): T {
  if (val === undefined || val === null) {
    throw new Error("Parameter is null")
  }
  return val
}
