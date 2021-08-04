
import { nonNull } from "../common/common"
import { Configs, UserConfigs } from "../common/configs"
import { getConfigDefaults } from "../common/config-defaults"
import { inject, InjectionKey, provide, reactive, watch } from "vue"
import merge from "lodash-es/merge"

const injectionKey = Symbol("style") as InjectionKey<Configs>

export function provideConfigs(configs: UserConfigs) {
  const results: Configs = reactive(getConfigDefaults())
  const styleKeys = Object.keys(results) as (keyof Configs)[]
  for (const key of styleKeys) {
    watch(() => configs[key], () => {
      merge(results[key], configs[key] || {})
    }, { immediate: true, deep: true })
  }

  provide(injectionKey, results)
  return results
}

function injectConfig<T extends keyof Configs>(key: T) {
  return nonNull(inject(injectionKey), `Configs(${key})`)[key]
}

export function useAllConfigs() {
  return nonNull(inject(injectionKey))
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
