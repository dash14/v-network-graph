import { isReactive, reactive } from "vue"

/* ------------------------------------------ *
 * Utility
 * ------------------------------------------ */

export type RecursivePartial<T> = {
  [P in keyof T]?: T[P] extends (infer U)[]
    ? RecursivePartial<U>[]
    : T[P] extends (infer U)[] | undefined
      ? RecursivePartial<U>[]
      : T[P] extends object
        ? RecursivePartial<T[P]>
        : T[P] extends object | undefined
          ? RecursivePartial<T[P]>
          : T[P]
}

declare class Id<T extends string> {
  private IDENTITY: T
}

export type Reactive<T> = Id<"Reactive"> & T

export function Reactive<T extends object>(value: T): Reactive<T> {
  if (isReactive(value)) {
    return value as Reactive<T>
  } else {
    return reactive(value) as unknown as Reactive<T>
  }
}

export interface ReadonlyRef<T> {
  readonly value: T
}

export function nonNull<T>(val?: T | null, name = "Parameter"): T {
  if (val === undefined || val === null) {
    throw new Error(`${name} is null`)
  }
  return val
}
