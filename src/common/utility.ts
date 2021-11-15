import { Node, Position, Size } from "./types"
import { Config, NodeConfig } from "./configs"
import isEqual from "lodash-es/isEqual"

export function keyOf<T>(obj: T): (keyof T)[] {
  return Object.keys(obj) as (keyof T)[]
}

export function entriesOf<T, K extends keyof T>(obj: T): [K, T[K]][] {
  return Object.entries(obj) as [K, T[K]][]
}

export function updateObjectDiff<T extends Record<string, any>>(target: T, from: T) {
  const keys = new Set<keyof T>(Object.keys(target))
  entriesOf(from).forEach(([key, value]) => {
    if (!isEqual(target[key], value)) {
      target[key] = value
    }
    keys.delete(key)
  })
  keys.forEach(k => delete target[k])
}

export function getNodeSize(node: Node, style: NodeConfig, scale: number): Size {
  const shape = Config.values(style.normal, node)
  if (shape.type == "circle") {
    return {
      width: shape.radius * 2 * scale,
      height: shape.radius * 2 * scale,
    }
  } else {
    return {
      width: shape.width * scale,
      height: shape.height * scale,
    }
  }
}

export function areNodesCollision(
  nodePos: Position,
  nodeSize: Size,
  targetNodePos: Position,
  targetNodeSize: Size
): boolean {
  // x方向の衝突チェック
  const distanceX = Math.abs(nodePos.x - targetNodePos.x)
  const collisionX = distanceX < nodeSize.width / 2 + targetNodeSize.width / 2

  // y方向の衝突チェック
  const distanceY = Math.abs(nodePos.y - targetNodePos.y)
  const collisionY = distanceY < nodeSize.height / 2 + targetNodeSize.height / 2
  return collisionX && collisionY
}

export function applyScaleToDasharray(dasharray: number | string | undefined, scale: number) {
  let result: number | string = 0
  if (scale === 1 || dasharray === undefined || dasharray === "none") {
    result = dasharray ?? 0
  } else if (typeof dasharray === "string") {
    result = dasharray
      .split(/\s+/)
      .map(v => parseInt(v) * scale)
      .filter(v => !isNaN(v))
      .join(" ")
  } else {
    result = dasharray * scale
  }
  return result && result !== "0" ? result : undefined
}

export function getDasharrayUnit(dasharray: number | string | undefined) {
  let result: number | string = 0
  if (dasharray === undefined || dasharray === "none") {
    result = 0
  } else if (typeof dasharray === "string") {
    const array = dasharray
      .split(/\s+/)
      .map(v => parseInt(v))
      .filter(v => !isNaN(v))
    if (array.length % 2 === 0) {
      // ex: 1 2 -> -  -  -  - ...
      result = array.reduce((s, n) => s + n, 0)
    } else {
      // ex: 1 2 3 -> -  --- --   -  --- ...
      result = array.reduce((s, n) => s + n, 0) * 2
    }
  } else {
    result = dasharray * 2 // 2 <- border and space
  }
  return result
}

export class MapUtil {
  static valueOf<K, V>(map: Map<K, V>) {
    return Array.from(map.values())
  }
}

type Args<T> = [...(T | null)[], T]

export function findFirstNonNull<T>(...values: Args<T>): T {
  return values.find(v => !!v) as T
}

export function convertToAscii(source: string): string {
  if (typeof btoa === undefined) {
    return Buffer.from(source).toString("base64").replaceAll("=", "")
  } else {
    return btoa(source).replaceAll("=", "")
  }
}
