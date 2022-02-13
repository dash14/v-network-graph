// Management states of objects
// - selected
// - hover
import { ref, Ref, UnwrapRef, watch } from "vue"
import { ObjectConfigs } from ".."
import { Reactive } from "@/common/common"
import { updateObjectDiff } from "@/utils/object"

/** An object with a field named id */
interface IdentifiedObject {
  id: string
}

/** Supported formats as input */
type InputObjects<T> = Record<string, T> | (IdentifiedObject & T)[]

function isInputRecord<T>(input: InputObjects<T>): input is Record<string, T> {
  return !(input instanceof Array)
}

type Objects<T> = Record<string, T>

interface ObjectStateDatumBase {
  id: string
  selected: boolean
  hovered: boolean
  selectable: Ref<boolean | number>
  zIndex: Ref<number>
}
type ObjectState<S extends ObjectStateDatumBase> = UnwrapRef<S>

type PartiallyPartial<T, K extends keyof T> = Pick<T, K> & Partial<Pick<T, K>>
type NewStateDatum<T extends ObjectStateDatumBase> = PartiallyPartial<T, keyof ObjectStateDatumBase>

export function useObjectState<T, S extends ObjectStateDatumBase>(
  input: Ref<InputObjects<T>>,
  config: ObjectConfigs<T>,
  selected: Reactive<Set<string>>,
  hovered: Reactive<Set<string>>,
  createState: (obj: Ref<Objects<T>>, id: string, state: NewStateDatum<S>) => S,
  terminateState?: (id: string, state: ObjectState<S>) => void
) {
  // target object translation
  const objects: Ref<Objects<T>> = ref({})
  watch(
    () => (input.value instanceof Array ? input.value : Object.keys(input.value)),
    () => {
      if (isInputRecord(input.value)) {
        objects.value = input.value
      } else {
        updateObjectDiff(objects.value, Object.fromEntries(input.value.map(i => [i.id, i])))
      }
    }
  )

  // handle object create/delete

  // z-order
}
