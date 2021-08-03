import { SvgPanZoomInstance } from "../utility/svg-pan-zoom-ex"
import { LayoutHandler } from "../layouts/handler"
import { Node, Edge, RecursivePartial, Edges } from "./types"

type CallableValue<V, T> = V | ((target: T) => V)

type CallableValues<V, T> = {
  [K in keyof V]: CallableValue<V[K], T>
}

export class Config {
  static value<V, T>(value: CallableValue<V, T>, target: T): V {
    return value instanceof Function ? value(target) : value
  }

  static values<V, T>(value: CallableValues<V, T>, target: T): V {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, v instanceof Function ? v(target) : v])
    ) as V
  }
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

export interface ShapeStyleBase {
  strokeWidth: number
  strokeColor?: string
  strokeDasharray?: string
  color: string
}

export type ShapeType = "circle" | "rect"

interface CircleShape extends ShapeStyleBase {
  radius: number
}

interface RectangleShape extends ShapeStyleBase {
  width: number
  height: number
  borderRadius: number
}

// `Shape` is an object whose fields can change depending on
// the type value.
// Normally, Union Types would be used, but in order to minimize
// the use of type guards when users build and use the configuration,
// we define it as an object that contains all fields.

type Shape<T extends ShapeType> = {
  type: T
} & (T extends "circle" ? CircleShape : Partial<CircleShape>)
  & (T extends "rect" ? RectangleShape : Partial<RectangleShape>)

export type ShapeStyle = Shape<"circle"> | Shape<"rect">
export type CircleShapeStyle = Shape<"circle">
export type RectangleShapeStyle = Shape<"rect">

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
  dasharray?: string
}

export interface NodeConfig<N extends Node = Node> {
  normal: CallableValues<ShapeStyle, N>
  hover?: CallableValues<ShapeStyle, N>
  selected?: CallableValues<ShapeStyle, N>
  draggable: boolean
  selectable: boolean | number
  label: CallableValues<NodeLabelStyle, N>
  focusring: NodeFocusRingStyle
}

/* Edge style */

export interface StrokeStyle {
  width: number
  color?: string
  dasharray?: string
  linecap?: "butt" | "round" | "square"
  animate: boolean
  animationSpeed: number
}

export interface EdgeConfig<E extends Edge = Edge> {
  normal: CallableValues<StrokeStyle, E>
  hover?: CallableValues<StrokeStyle, E>
  selected: CallableValues<StrokeStyle, E>
  selectable: boolean | number
  gap: number
  summarize: boolean | ((edge: Edges, configs: Configs) => boolean)
  summarized: {
    label: LabelStyle
    shape: ShapeStyle
    stroke: StrokeStyle
  }
}

/* Configuration */

export interface Configs<N extends Node = Node, E extends Edge = Edge> {
  view: ViewConfig
  node: NodeConfig<N>
  edge: EdgeConfig<E>
}

/** For specification by the user */
export type UserConfigs<N extends Node = Node, E extends Edge = Edge> = RecursivePartial<Configs<N, E>>

/** Make a config with self object */
export function withSelf<T extends {[name: string]: any}>(callback: (self: T) => T): T {
  const self = {} as T
  return Object.assign(self, callback(self))
}
