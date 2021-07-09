import { reactive, ref, Ref } from "@vue/reactivity"
import { watch } from "@vue/runtime-core"
import isEqual from "lodash-es/isEqual"

export function bindProp<T, K extends keyof T>(
  props: T,
  name: K,
  emit: any
  // filter?: (arg: T[K]) => T[K]
): Ref<T[K]> {
  // two-way bindingの紐付けを構築する.

  // 必ずpropsで渡されるとは限らない(emitしても書き換わらない)ため、
  // 自身での管理用に常にrefを保持する

  // if (filter) {
  //   // writable computed を使用する案もあるが、Vue 3 では
  //   // 配列の要素変更が通知されない挙動があるため避ける.
  //   const prop = ref<T[K]>(filter(props[name])) as Ref<T[K]>
  //   watch(() => props[name], v => {
  //     const filtered = filter(v)
  //     if (!isEqual(filtered, prop.value)) {
  //       prop.value = filtered
  //     }
  //   })
  //   watch(prop, v => {
  //     const filtered = filter(v)
  //     if (!isEqual(filtered, props[name])) {
  //       emit(`update:${name}`, filtered)
  //     }
  //   })
  //   return prop

  // } else {
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
      emit(`update:${name}`, v)
    }
  })
  return prop
}

export function bindPropKeyArray<T, K extends T[K] extends string[] ? keyof T : never>(
  props: T,
  name: K,
  sourceObject: { [name: string]: any },
  emit: any
) {
  // 指定propの双方向バインディングを生成する.
  // 指定propがオブジェクトのキーを示すことを前提とする.
  const bound = reactive<string[]>([])
  watch(
    () => props[name],
    () => {
      const filtered = (props[name] as unknown as string[]).filter(n => n in sourceObject)
      if (!isEqual(filtered, bound)) {
        bound.splice(0, bound.length, ...filtered)
      }
    },
    { immediate: true }
  )
  watch(bound, v => {
    if (!isEqual(props[name], bound)) {
      emit(`update:${name}`, v)
    }
  })
  return bound
}
