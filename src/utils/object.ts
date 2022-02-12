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
