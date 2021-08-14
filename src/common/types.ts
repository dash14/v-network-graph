import { RecursivePartial } from "./common"

/* ------------------------------------------ *
 * Network graph elements
 * ------------------------------------------ */

export interface Node {
  name?: string
  // any properties
  [x: string]: any
}

export type Nodes = Record<string, Node>

export interface Edge {
  source: string
  target: string
  // any properties
  [x: string]: any
}

export type Edges = Record<string, Edge>

export interface LinePosition {
  x1: number
  y1: number
  x2: number
  y2: number
}

export type LayerPosition =
  | "nodes"
  | "focusring"
  | "edges"
  | "base"
  | "grid"
  | "background"
  | "root"
export const LayerPositions: readonly LayerPosition[] = [
  "nodes",
  "focusring",
  "edges",
  "base",
  "grid",
  "background",
  "root",
]
export type Layers = Record<string, LayerPosition>

/* ------------------------------------------ *
 * Layouts
 * ------------------------------------------ */

export interface Position {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
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
 * Paths
 * ------------------------------------------ */

export interface Path {
  edges: string[]
  // any properties
  [x: string]: any
}

export type Paths = Path[]

// line: point | curve: [control-point, control-point, target-point]
export type PositionOrCurve = Position | [Position, Position, Position]

/* ------------------------------------------ *
 * Events
 * ------------------------------------------ */

export type NodePointerEvent = { node: string; event: PointerEvent }
export type EdgePointerEvent = { edge: string; event: PointerEvent }

export type Events = {
  "view:load": undefined
  "view:unload": undefined
  "view:mode": "default" | "node" | "edge"
  "view:zoom": number
  "view:pan": { x: number; y: number }
  "view:fit": undefined
  "view:resize": { x: number; y: number; width: number; height: number }
  "node:click": NodePointerEvent
  "node:pointerover": NodePointerEvent
  "node:pointerout": NodePointerEvent
  "node:pointerup": NodePointerEvent
  "node:pointerdown": NodePointerEvent
  "node:dragstart": { [name: string]: Position }
  "node:pointermove": { [name: string]: Position }
  "node:dragend": { [name: string]: Position }
  "node:select": string[]
  "edge:pointerup": EdgePointerEvent
  "edge:pointerdown": EdgePointerEvent
  "edge:click": EdgePointerEvent
  "edge:select": string[]
  "path:click": Path
}

export type EventHandlers = {
  "*"?: <T extends keyof Events>(type: T, event: Events[T]) => void
} & {
  [K in keyof Events]?: (event: Events[K]) => void
}

export type OnClickHandler = (param: NodePointerEvent) => void
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
