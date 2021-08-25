import { SvgPanZoomInstance } from "../utility/svg-pan-zoom-ex"
import { LayoutHandler } from "../layouts/handler"
import { RecursivePartial } from "./common"
import { Node, Edge, Edges, Path } from "./types"

type CallableValue<V, T> = V | ((target: T) => V)

type CallableValues<V, T> = {
  [K in keyof V]: CallableValue<V[K], T>
}

export class Config {
  static value<V, T>(value: CallableValue<V, T>, target: T): V {
    return value instanceof Function ? value(target) : value
  }

  static values<V, T>(value: CallableValues<V, T>, target: T): V {
    if (Object.values(value).filter(v => v instanceof Function).length === 0) {
      return value as V  // all config are literals
    }
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, v instanceof Function ? v(target) : v])
    ) as V
  }
}

/* View configuration */

export interface GridLine {
  color: string
  width: number
  dasharray?: string | number
}

export interface GridConfig {
  visible: boolean
  interval: number
  thickIncrements: number | false
  line: GridLine
  thick: GridLine
}

export interface ViewConfig {
  scalingObjects: boolean
  panEnabled: true
  zoomEnabled: true
  minZoomLevel: number
  maxZoomLevel: number
  fit: boolean
  layoutHandler: LayoutHandler
  onSvgPanZoomInitialized?: (instance: SvgPanZoomInstance) => void
  grid: GridConfig
}

/* Shape style */

export interface ShapeStyleBase {
  strokeWidth: number
  strokeColor?: string
  strokeDasharray?: string | number
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

type ShapeBase<T extends ShapeType = ShapeType> = {
  type: T
}

export type ShapeStyle = ShapeBase & CircleShape & RectangleShape
export type CircleShapeStyle = ShapeBase<"circle"> & CircleShape
export type RectangleShapeStyle = ShapeBase<"rect"> & RectangleShape
export type AnyShapeStyle = CircleShapeStyle | RectangleShapeStyle

/* Label style */

interface Padding {
  vertical: number
  horizontal: number
}
export interface LabelBackgroundStyle {
  visible: boolean
  color?: string,
  padding?: number | Padding,
  borderRadius?: number
}

export interface LabelStyle {
  fontFamily?: string
  fontSize: number
  color: string
  background?: LabelBackgroundStyle
  lineHeight: number
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
  dasharray?: string | number
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
  color: string
  dasharray?: string | number
  linecap?: "butt" | "round" | "square"
  animate: boolean
  animationSpeed: number
}

export interface EdgeLabelStyle extends LabelStyle {
  margin: number
  padding: number
}

export type EdgeHeadType = "none" | "arrow" | "angle" | "circle" | "custom"

export interface HeadStyle {
  type: EdgeHeadType
  width: number
  height: number
  margin: number
  units: "strokeWidth" | "userSpaceOnUse"
  color: string | null
  customMarker?: string
}

export interface EdgeConfig<E extends Edge = Edge> {
  normal: CallableValues<StrokeStyle, E>
  hover?: CallableValues<StrokeStyle, E>
  selected: CallableValues<StrokeStyle, E>
  selectable: boolean | number
  gap: number | ((edges: Edges, configs: Configs) => number)
  head: {
    source: CallableValues<HeadStyle, [E, StrokeStyle]>
    target: CallableValues<HeadStyle, [E, StrokeStyle]>
  }
  margin: undefined | number
  summarize: boolean | ((edges: Edges, configs: Configs) => boolean)
  summarized: {
    label: LabelStyle
    shape: ShapeStyle
    stroke: StrokeStyle
  },
  label: EdgeLabelStyle
}

/* Path config */
export interface PathStrokeStyle extends StrokeStyle {
  linejoin: "miter" | "round" | "bevel"
}

export interface PathConfig<P extends Path = Path> {
  visible: boolean
  clickable: boolean
  curveInNode: boolean
  path: CallableValues<PathStrokeStyle, P>
}

/* Configuration */

export interface Configs<N extends Node = Node, E extends Edge = Edge, P extends Path = Path> {
  view: ViewConfig
  node: NodeConfig<N>
  edge: EdgeConfig<E>
  path: PathConfig<P>
}

/** For specification by the user */
export type UserConfigs<N extends Node = Node, E extends Edge = Edge> = RecursivePartial<Configs<N, E>>

/** Make a config with self object */
export function withSelf<T extends {[name: string]: any}>(callback: (self: T) => T): T {
  const self = {} as T
  return Object.assign(self, callback(self))
}
