import type { Ref } from "vue"
import { ref, shallowRef, watchEffect } from "vue"
import type { InputPaths, Path } from "@/common/types"

export interface UseTranslatePathsToObjectReturn {
  objects: Ref<Record<string, Path>>
  isInCompatibilityModeForPath: Ref<boolean>
}

export function useTranslatePathsToObject(input: Ref<InputPaths>): UseTranslatePathsToObjectReturn {
  // Shallow, so that paths given as an object are passed on as they are, like nodes and edges.
  const objects = shallowRef<Record<string, Path>>({})

  const isInCompatibilityModeForPath = ref(false)
  let nextId = 1
  const idStore = new Map<Path, string>()

  // translate for compatibility
  watchEffect(() => {
    if (input.value instanceof Array) {
      const containKeys = new Set<string>([])
      objects.value = Object.fromEntries(
        input.value.map(path => {
          let id = path.id
          if (!id) {
            if (!isInCompatibilityModeForPath.value) {
              isInCompatibilityModeForPath.value = true
              console.warn(
                "[v-network-graph] Please specify the `id` field for the `Path` object." +
                  " Currently, this works for compatibility," +
                  " but in the future, the id field will be required."
              )
            }
            id = idStore.get(path)
            if (!id) {
              id = "path-" + nextId++
              idStore.set(path, id)
            }
          }
          containKeys.add(id)
          return [id, path]
        })
      )
      for (const [path, id] of Array.from(idStore.entries())) {
        if (!containKeys.has(id)) {
          idStore.delete(path)
        }
      }
    } else {
      objects.value = input.value
    }
  })

  return { objects, isInCompatibilityModeForPath }
}
