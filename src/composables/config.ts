import { isPlainObject, merge, mergeWith } from "lodash-es"
import type { InjectionKey, Ref } from "vue"
import { inject, provide, reactive, watch } from "vue"
import { nonNull } from "@/common/common"
import { getConfigDefaults } from "@/common/config-defaults"
import { Configs, UserConfigs } from "@/common/configs"

const injectionKey = Symbol("style") as InjectionKey<Configs>

function merger(destination: any, source: any) {
  if (isPlainObject(destination)) {
    return merge(destination, source)
  } else {
    return source // overwrite
  }
}

export function provideConfigs<T extends Configs = Configs>(
  configs: Ref<UserConfigs>,
  defaults: () => T = getConfigDefaults as () => T
): T {
  const results = reactive(defaults()) as T
  const styleKeys = Object.keys(results) as (keyof Configs)[]
  for (const key of styleKeys) {
    watch(
      () => configs.value[key],
      () => {
        mergeWith(results[key], configs.value[key] || {}, merger)
      },
      { immediate: true, deep: true }
    )
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

export function usePathConfig() {
  return injectConfig("path")
}
