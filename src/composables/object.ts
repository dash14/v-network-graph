import { ref, Ref, watch, watchEffect } from "vue"
import { InputObjects, InputPaths, Path } from "@/common/types"
import { updateObjectDiff } from "@/utils/object"

type Objects<T> = Record<string, T>

export function isInputRecordType<T>(input: InputObjects<T>): input is Record<string, T> {
  return !(input instanceof Array)
}

export function useTranslateToObject<T>(input: Ref<InputObjects<T>>) {
  const objects: Ref<Objects<T>> = ref({})
  watch(
    () => (input.value instanceof Array ? [ ...input.value ] : Object.keys(input.value)),
    () => {
      if (isInputRecordType(input.value)) {
        objects.value = input.value
      } else {
        updateObjectDiff(objects.value, Object.fromEntries(input.value.map(i => [i.id, i])))
      }
    },
    { immediate: true }
  )
  return objects
}

export function useTranslatePathsToObject<T>(input: Ref<InputPaths>) {
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
                "Please specify the `id` field for the `Path` object." +
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
