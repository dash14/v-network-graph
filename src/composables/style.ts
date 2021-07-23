
import { nonNull } from "../common/types"
import { Configs, UserConfigs } from "../common/configs"
import { STYLE_DEFAULT } from "../common/config-defaults"
import { inject, provide, reactive, watch } from "vue"
import cloneDeep from "lodash-es/cloneDeep"
import merge from "lodash-es/merge"

function getObjectStyle<K extends keyof Configs>(style: UserConfigs, key: keyof Configs): Configs[K] {
  const result = cloneDeep(STYLE_DEFAULT[key]) as Configs[K]
  const userStyle: UserConfigs[K] = style[key] || {}
  merge(result, userStyle)
  return result
}

const styleKeys = Object.keys(STYLE_DEFAULT) as (keyof Configs)[]

const injectionKeys = Object.fromEntries(
  styleKeys.map(k => [k, Symbol(`style:${k}`)])
)

export function provideConfigs(configs: UserConfigs) {
  const results: UserConfigs = {}
  for (const key of styleKeys) {
    // computed を provide で提供することができないため
    // 独自に reactive を生成し、変更を追随する.
    const target = reactive({})
    watch(() => configs[key], () => {
      Object.assign(target, getObjectStyle(configs, key))
    }, { immediate: true, deep: true })
    provide(injectionKeys[key], target)
    results[key] = target
  }
  return results as Configs
}

function injectConfig<T extends keyof Configs>(key: T) {
  return nonNull(inject(injectionKeys[key]), `Configs(${key})`) as Configs[T]
}

export function useViewConfig() {
  return injectConfig("view")
}

export function useNodeConfig() {
  return injectConfig("node")
}

export function useEdgeConfig() {
  return injectConfig("edge")
}
