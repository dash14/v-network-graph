import { isReactive, reactive } from "vue"

/** レイヤ位置 */
export enum LayerPos {
  BACKGROUND = "background",
  PATHS = "paths",
  NOTIFICATIONS = "notifications",
}

/** ノード */
export interface Node {
  name?: string
  // any properties
  [x: string]: any
}

/** ノード群 */
export type Nodes = { [name: string]: Node }

/* リンク */
export interface Edge {
  source: string
  target: string
  // any properties
  [x: string]: any
}

/* リンク群 */
export type Edges = { [name: string]: Edge }

/* ------------------------------------------ *
 * Utility
 * ------------------------------------------ */

export type RecursivePartial<T> = {
  [P in keyof T]?:
    T[P] extends (infer U)[] ? RecursivePartial<U>[] :
    T[P] extends ((infer U)[] | undefined) ? RecursivePartial<U>[] :
    // eslint-disable-next-line @typescript-eslint/ban-types
    T[P] extends object ? RecursivePartial<T[P]> :
    // eslint-disable-next-line @typescript-eslint/ban-types
    T[P] extends (object | undefined) ? RecursivePartial<T[P]> :
    T[P];
};

declare class Id<T extends string> {
  private IDENTITY: T;
}

export type Reactive<T> = Id<'Reactive'> & T;

// eslint-disable-next-line @typescript-eslint/ban-types
export function Reactive<T extends object>(value: T): Reactive<T> {
  if (isReactive(value)) {
    return value as Reactive<T>
  } else {
    return reactive(value) as Reactive<T>
  }
}


export interface ReadonlyRef<T> {
  readonly value: T;
}

export function nonNull<T>(val?: T, name = "Parameter"): T {
  if (val === undefined || val === null) {
    throw new Error(`${name} is null`)
  }
  return val
}

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
 * Events
 * ------------------------------------------ */

export type NodePointerEvent = { node: string, event: PointerEvent }
export type EdgePointerEvent = { edge: string, event: PointerEvent }

export type Events = {
  "node:click": NodePointerEvent,
  "node:pointerover": NodePointerEvent,
  "node:pointerout": NodePointerEvent,
  "node:pointerup": NodePointerEvent,
  "node:pointerdown": NodePointerEvent,
  "node:dragstart": { [name: string]: Position },
  "node:pointermove": { [name: string]: Position },
  "node:dragend": { [name: string]: Position },
  "node:select": string[],
  "edge:pointerup": EdgePointerEvent,
  "edge:pointerdown": EdgePointerEvent,
  "edge:click": EdgePointerEvent,
  "edge:select": string[],
  "view:mode": "default" | "node" | "edge",
  "view:zoom": number,
  "view:pan": { x: number, y: number },
  "view:fit": undefined,
}

export type EventHandler = <T extends keyof Events>(event : T, value: Events[T]) => void
export type OnClickHandler = (param: NodePointerEvent) => void
export type OnDragHandler = (param: { [name: string]: Position }) => void
