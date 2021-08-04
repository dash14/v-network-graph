import { watch, reactive, ref, Ref } from "vue"
import isEqual from "lodash-es/isEqual"
import { Reactive } from "./common"

export function bindProp<T, K extends string & keyof T>(
  props: T,
  name: K,
  emit: (event: `update:${K}`, ...args: any[]) => void,
  filter?: (arg: T[K]) => T[K]
): Ref<T[K]> {
  // two-way bindingの紐付けを構築する.

  // 必ずpropsで渡されるとは限らない(emitしても書き換わらない)ため、
  // 自身での管理用に常にrefを保持する

  if (filter) {
    const prop = ref<T[K]>(filter(props[name])) as Ref<T[K]>
    const update = (filtered: T[K]) => {
      if (!isEqual(filtered, prop.value)) {
        prop.value = filtered
      }
      if (!isEqual(filtered, props[name])) {
        emit(`update:${name}` as const, filtered)
      }
    }
    watch(() => filter(prop.value), update)
    watch(() => props[name],v => update(filter(v)))
    if (prop.value !== props[name]) {
      emit(`update:${name}` as const, prop.value)
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
      emit(`update:${name}` as const, v)
    }
  })
  return prop
}

type KeysOfType<Obj, Val> = {
  [K in keyof Obj]-?: Obj[K] extends Val ? K : never
}[keyof Obj]

// export function bindPropKeyArray<T, K extends string & KeysOfType<T, string[]>>(
//   props: T,
//   name: K,
//   sourceObject: { [name: string]: any },
//   emit: (event: `update:${K}`, ...args: any[]) => void
// ): Reactive<string[]> {
//   // 指定propの双方向バインディングを生成する.
//   // 指定propがオブジェクトのキーを示すことを前提とする.
//   const bound = reactive<string[]>([])
//   watch(
//     () => props[name],
//     () => {
//       // 型チェックで string[] だと認識してくれないため一旦 any を介する
//       const prop: string[] = props[name] as any
//       const filtered = prop.filter(n => n in sourceObject)
//       if (!isEqual(filtered, bound)) {
//         bound.splice(0, bound.length, ...filtered)
//       }
//     },
//     { immediate: true }
//   )
//   watch(bound, v => {
//     if (!isEqual(props[name], bound)) {
//       emit(`update:${name}` as const, v)
//     }
//   })
//   return Reactive(bound)
// }

export function bindPropKeySet<T, K extends string & KeysOfType<T, string[]>>(
  props: T,
  name: K,
  sourceObject: { [name: string]: any },
  emit: (event: `update:${K}`, ...args: any[]) => void
): Reactive<Set<string>> {
  // 指定propの双方向バインディングを生成する.
  // 指定propがオブジェクトのキーを示すことを前提とする.
  const bound = reactive<Set<string>>(new Set())
  watch(
    () => props[name],
    () => {
      // 型チェックで string[] だと認識してくれないため一旦 any を介する
      const prop: string[] = props[name] as any
      const filtered = prop.filter(n => n in sourceObject)
      if (!isEqual(filtered, bound)) {
        bound.clear()
        filtered.forEach(bound.add, bound)
      }
    },
    { immediate: true }
  )
  watch(bound, () => {
    const array = Array.from(bound)
    if (!isEqual(props[name], array)) {
      emit(`update:${name}` as const, array)
    }
  })
  return Reactive(bound)
}
