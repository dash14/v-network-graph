import { isReactive } from "@vue/reactivity";

/** レイヤ位置 */
export enum LayerPos {
  BACKGROUND = "background",
  PATHS = "paths",
  NOTIFICATIONS = "notifications",
}

/** ノード */
export interface Node {
  name?: string
  // 任意の内容
  [x: string]: any
}

/** ノード群 */
export type Nodes = { [name: string]: Node }

/* リンク */
export interface Edge {
  source: string
  target: string
  // 任意の内容
  [x: string]: any
}

/* リンク群 */
export type Edges = { [name: string]: Edge }

/* ------------------------------------------ *
 * Utility
 * ------------------------------------------ */

export type RecursivePartial<T> = {
  [P in keyof T]?: RecursivePartial<T[P]>;
}

declare class Id<T extends string> {
  private IDENTITY: T;
}

export type Reactive<T> = Id<'Reactive'> & T;

export function Reactive<T>(value: T): Reactive<T> {
  if (!isReactive(value)) {
    throw new Error("value is not reactive")
  }
  return value as Reactive<T>;
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

export type NodePointerEvent = { node: string, event: MouseEvent }
export type EdgePointerEvent = { edge: string, event: MouseEvent }

export type Events = {
  "node:click": NodePointerEvent,
  "node:pointerup": NodePointerEvent,
  "node:pointerdown": NodePointerEvent,
  "node:dragstart": { [name: string]: Position },
  "node:pointermove": { [name: string]: Position },
  "node:dragend": { [name: string]: Position },
  "node:select": string[],
  "edge:click": EdgePointerEvent,
  "edge:select": string[],
  "view:zoom": number,
  "view:pan": { x: number, y: number },
  "view:fit": undefined,
}

export type EventHandler = <T extends keyof Events>(event : T, value: Events[T]) => void
export type OnClickHandler = (param: NodePointerEvent) => void
export type OnDragHandler = (param: { [name: string]: Position }) => void
