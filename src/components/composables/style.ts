
import { nonNull, Styles, UserStyles } from "../common/types"
import { STYLE_DEFAULT } from "../common/style-defaults"
import { inject, provide, reactive, watch } from "@vue/runtime-core"

function getObjectStyle<K extends keyof Styles>(style: UserStyles, key: keyof Styles): Styles[K] {
  const result = { ...STYLE_DEFAULT[key] } as Styles[K]
  const userStyle: UserStyles[K] = style[key] || {}
  // eslint-disable-next-line @typescript-eslint/ban-types
  for (const [param, value] of Object.entries(userStyle as Object)) {
    if (value === undefined) continue
    result[param as keyof Styles[K]] = value
  }
  return result
}

const styleKeys = Object.keys(STYLE_DEFAULT) as (keyof Styles)[]

const injectionKeys = Object.fromEntries(
  styleKeys.map(k => [k, Symbol(`style:${k}`)])
)

export function provideStyles(styles: UserStyles) {
  const results: UserStyles = {}
  for (const key of styleKeys) {
    // computed を provide で提供することができないため
    // 独自に reactive を生成し、変更を追随する.
    const target = reactive({})
    watch(() => styles[key], () => {
      Object.assign(target, getObjectStyle(styles, key))
    }, { immediate: true, deep: true })
    provide(injectionKeys[key], target)
    results[key] = target
  }
  return results as Styles
}

function injectStyle<T extends keyof Styles>(key: T) {
  return nonNull(inject(injectionKeys[key])) as Styles[T]
}

export function useNodeStyle() {
  return injectStyle("node")
}

export function useNodeLabelStyle() {
  return injectStyle("nodeLabel")
}

export function useNodeSelectionStyle() {
  return injectStyle("nodeSelection")
}

export function useLinkStyle() {
  return injectStyle("link")
}
