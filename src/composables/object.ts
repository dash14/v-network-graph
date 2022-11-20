import { ref, Ref, watchEffect } from "vue"
import { InputPaths, Path } from "@/common/types"

export function useTranslatePathsToObject(input: Ref<InputPaths>) {
  const objects = ref<Record<string, Path>>({})

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
      if (isInCompatibilityModeForPath.value) {
        for (const [path, id] of Array.from(idStore.entries())) {
          if (!containKeys.has(id)) {
            idStore.delete(path)
          }
        }
      }
    } else {
      objects.value = input.value
    }
  })

  return { objects, isInCompatibilityModeForPath }
}
