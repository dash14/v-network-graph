import { RecursivePartial } from "./common"

/* ------------------------------------------ *
 * Core types
 * ------------------------------------------ */

export interface Position {
  x: number
  y: number
}

export interface LinePosition {
  p1: Position
  p2: Position
}

export interface Size {
  width: number
  height: number
}

export interface Rectangle {
  pos: Position
  size: Size
}

/** An object with a field named id */
export interface IdentifiedObject {
  id: string
}

/* ------------------------------------------ *
 * Network graph elements
 * ------------------------------------------ */

export interface Node {
  name?: string
  // any properties
  [x: string]: any
}

export type Nodes = Record<string, Node>
export type NodeWithId = Node & IdentifiedObject

export interface Edge {
  source: string
  target: string
  // any properties
  [x: string]: any
}

export type Edges = Record<string, Edge>
export type EdgeWithId = Edge & IdentifiedObject

export type LayerName = "edges" | "edge-labels" | "focusring" | "nodes" | "node-labels" | "paths"

export type LayerPosition = LayerName | "base" | "grid" | "background" | "root"

export type Layers = Record<string, LayerPosition>

export const LayerPositions: readonly LayerPosition[] = [
  "paths",
  "node-labels",
  "nodes",
  "focusring",
  "edge-labels",
  "edges",
  "base",
  "grid",
  "background",
  "root",
]

/* ------------------------------------------ *
 * View
 * ------------------------------------------ */

export type ViewMode = "default" | "node" | "edge" | "path" | "box-selection"

/* ------------------------------------------ *
 * Layouts
 * ------------------------------------------ */

export interface FixablePosition extends Position {
  fixed?: boolean
}

export type NodePositions = Record<string, FixablePosition>

export interface Layouts {
  nodes: NodePositions
}
/** for User Specified */
export type UserLayouts = RecursivePartial<Layouts>

/* ------------------------------------------ *
 * Edge labels
 * ------------------------------------------ */

export interface EdgePosition {
  source: Position
  target: Position
}

export interface EdgeLabelArea {
  source: {
    above: Position
    below: Position
  }
  target: {
    above: Position
    below: Position
  }
}

export interface LabelRectangle {
  source: {
    top: Position
    bottom: Position
  }
  target: {
    top: Position
    bottom: Position
  }
}

/* ------------------------------------------ *
 * Paths
 * ------------------------------------------ */

export interface Path {
  id?: string
  edges: string[]
  // any properties
  [x: string]: any
}

export type Paths = Record<string, Path>

// When specified in a list, the ID is not needed for a while to
// keep compatibility.
// TODO: After a while, remove `| Path[]`.
export type InputPaths = Record<string, Path> | Path[]

// line: point | curve: [control-point, control-point, target-point] | "arc" | move to next point: null
export type PositionOrCurve = Position | Position[] | string | null

/* ------------------------------------------ *
 * Events
 * ------------------------------------------ */

export type ViewEvent<T extends Event> = { event: T }
export type NodeEvent<T extends Event> = { node: string; event: T }
export type EdgeEvent<T extends Event> =
  | { edge: string; edges: string[]; summarized: false; event: T }
  | { edge?: undefined; edges: string[]; summarized: true; event: T }
export type PathEvent<T extends Event> = { path: string; event: T }

// For compatibility with previous versions
export type NodePointerEvent = NodeEvent<PointerEvent>
export type EdgePointerEvent = EdgeEvent<PointerEvent>

export type Events = {
  "view:load": undefined
  "view:unload": undefined
  "view:mode": ViewMode
  "view:zoom": number
  "view:pan": { x: number; y: number }
  "view:fit": undefined
  "view:resize": { x: number; y: number; width: number; height: number }
  "view:click": ViewEvent<MouseEvent>
  "view:dblclick": ViewEvent<MouseEvent>
  "view:contextmenu": ViewEvent<MouseEvent>
  "node:click": NodeEvent<MouseEvent>
  "node:dblclick": NodeEvent<MouseEvent>
  "node:pointerover": NodeEvent<PointerEvent>
  "node:pointerout": NodeEvent<PointerEvent>
  "node:pointerup": NodeEvent<PointerEvent>
  "node:pointerdown": NodeEvent<PointerEvent>
  "node:contextmenu": NodeEvent<MouseEvent>
  "node:dragstart": { [name: string]: Position }
  "node:pointermove": { [name: string]: Position }
  "node:dragend": { [name: string]: Position }
  "node:select": string[]
  "edge:pointerup": EdgeEvent<PointerEvent>
  "edge:pointerdown": EdgeEvent<PointerEvent>
  "edge:click": EdgeEvent<MouseEvent>
  "edge:dblclick": EdgeEvent<MouseEvent>
  "edge:pointerover": EdgeEvent<PointerEvent>
  "edge:pointerout": EdgeEvent<PointerEvent>
  "edge:contextmenu": EdgeEvent<MouseEvent>
  "edge:select": string[]
  "path:select": string[]
  "path:pointerup": PathEvent<PointerEvent>
  "path:pointerdown": PathEvent<PointerEvent>
  "path:click": PathEvent<MouseEvent>
  "path:dblclick": PathEvent<MouseEvent>
  "path:pointerover": PathEvent<PointerEvent>
  "path:pointerout": PathEvent<PointerEvent>
  "path:contextmenu": PathEvent<MouseEvent>
}

export type EventHandlers = {
  "*"?: <T extends keyof Events>(type: T, event: Events[T]) => void
} & {
  [K in keyof Events]?: (event: Events[K]) => void
}

export type OnClickHandler = (param: NodeEvent<MouseEvent>) => void
export type OnDragHandler = (param: { [name: string]: Position }) => void

/* ------------------------------------------ *
 * SVG area
 * ------------------------------------------ */

export interface Point {
  x: number
  y: number
}

export interface Sizes {
  width: number
  height: number
  viewBox: {
    x: number
    y: number
    width: number
    height: number
  }
}
