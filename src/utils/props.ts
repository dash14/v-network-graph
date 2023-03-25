import { watch, reactive, ref, Ref } from "vue"
import { isEqual } from "lodash-es"
import { Reactive } from "../common/common"

export function bindProp<T extends object, K extends keyof T>(
  props: T,
  name: K,
  emit: (event: `update:${K & string}`, ...args: any[]) => void,
  filter?: (arg: T[K]) => T[K]
): Ref<T[K]> {
  // Build two-way binding ties.

  // Since it is not always passed in props (emit does not
  // rewrite it), always keep a ref for self management.

  if (filter) {
    const prop = ref<T[K]>(filter(props[name])) as Ref<T[K]>
    const update = (filtered: T[K]) => {
      if (!isEqual(filtered, prop.value)) {
        prop.value = filtered
      }
      if (!isEqual(filtered, props[name])) {
        emit(`update:${name as string & K}`, filtered)
      }
    }
    watch(() => filter(prop.value), update)
    watch(() => props[name],v => update(filter(v)))
    if (prop.value !== props[name]) {
      emit(`update:${name as string & K}`, prop.value)
    }
    return prop
  }

  const prop = ref<T[K]>(props[name]) as Ref<T[K]>
  watch(
    () => props[name],
    v => {
      if (!isEqual(v, prop.value)) {
        prop.value = v
      }
    }
  )
  watch(prop, v => {
    if (!isEqual(v, props[name])) {
      emit(`update:${name as string & K}`, v)
    }
  })
  return prop
}

type KeysOfType<Obj, Val> = {
  [K in keyof Obj]-?: Obj[K] extends Val ? K : never
}[keyof Obj]

export function bindPropKeySet<T extends object, K extends string & KeysOfType<T, string[]>>(
  props: T,
  name: K,
  sourceObject: Ref<{ [name: string]: any }>,
  emit: (event: `update:${K & string}`, ...args: any[]) => void
): Reactive<Set<string>> {
  // Generate two-way bindings for a given prop.
  // Assumes that the specified prop indicates the key of the object.
  const bound = reactive<Set<string>>(new Set())
  watch(
    () => props[name],
    () => {
      // Since it is not recognized as a string[] by type checking,
      // use any for now.
      const prop: string[] = props[name] as any
      const filtered = prop.filter(n => n in sourceObject.value)
      if (!isEqual(filtered, Array.from(bound))) {
        bound.clear()
        filtered.forEach(bound.add, bound)
      }
    },
    { deep: true, immediate: true }
  )
  watch(bound, () => {
    const array = Array.from(bound)
    if (!isEqual(props[name], array)) {
      emit(`update:${name}` as const, array)
    }
  })
  return Reactive(bound)
}
