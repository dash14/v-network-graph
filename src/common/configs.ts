import { SvgPanZoomInstance } from "../utility/svg-pan-zoom-ex"
import { LayoutHandler } from "../layouts/handler"
import { Node, RecursivePartial } from "./types"

type CallableValue<V, T> = V | ((target: T) => V)

type CallableValues<V, T> = {
  [K in keyof V]: CallableValue<V[K], T>
}

export function getConfig<V, T>(value: CallableValues<V, T>, target: T): V {
  return Object.fromEntries(
    Object.entries(value).map(([k, v]) => [k, v instanceof Function ? v(target) : v])
  ) as V
}

/* View configuration */

export interface ViewConfig {
  scalingObjects: boolean
  panEnabled: true
  zoomEnabled: true
  minZoomLevel: number
  maxZoomLevel: number
  layoutHandler: LayoutHandler
  onSvgPanZoomInitialized?: (instance: SvgPanZoomInstance) => void
}

/* Shape style */

export interface StrokeStyle {
  width: number
  color: string
  dasharray?: string
  linecap?: "butt" | "round" | "square"
}

export interface ShapeStyleBase {
  stroke?: StrokeStyle
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
  visible: boolean
  margin: number
  direction: NodeLabelDirection
  text: string
}

export interface NodeFocusRingStyle {
  visible: boolean
  width: number
  padding: number
  color: string
}

export interface NodeConfig {
  shape: CallableValues<ShapeStyle, Node>
  hover?: CallableValues<ShapeStyle, Node>
  selected?: CallableValues<ShapeStyle, Node>
  label: NodeLabelStyle
  draggable: boolean
  selectable: boolean | number
  focusring: NodeFocusRingStyle
}

/* Edge style */

export interface EdgeConfig {
  stroke: StrokeStyle
  hover?: StrokeStyle
  selected: StrokeStyle
  gap: number
  summarized: {
    label: LabelStyle
    shape: ShapeStyle
    line: StrokeStyle
  }
  selectable: boolean | number
}

/* Configuration */

export interface Configs {
  view: ViewConfig
  node: NodeConfig
  edge: EdgeConfig
}

/** For specification by the user */
export type UserConfigs = RecursivePartial<Configs>

/** Make a config with self object */
export function withSelf<T extends {[name: string]: any}>(callback: (self: T) => T): T {
  const self = {} as T
  return Object.assign(self, callback(self))
}
