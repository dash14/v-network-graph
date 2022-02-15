// Management states of objects
// - selected
// - hover
import { computed, ComputedRef, reactive, ref, Ref, toRef, unref, UnwrapRef, watch } from "vue"
import { Reactive } from "@/common/common"
import { Config, ObjectConfigs, ZOrderConfig } from "@/common/configs"
import { updateObjectDiff } from "@/utils/object"

/** An object with a field named id */
interface IdentifiedObject {
  id: string
}

/** Supported formats as input (Object or Array) */
type InputObjects<T> = Record<string, T> | (IdentifiedObject & T)[]

function isInputRecordType<T>(input: InputObjects<T>): input is Record<string, T> {
  return !(input instanceof Array)
}

type Objects<T> = Record<string, T>

interface ObjectStateDatumBase {
  id: string
  selected: boolean
  hovered: boolean
  selectable: ComputedRef<boolean | number>
  zIndex: ComputedRef<number>
}
type ObjectState<S extends ObjectStateDatumBase> = UnwrapRef<S>

type PartiallyPartial<T, K extends keyof T> = Pick<T, K> & Partial<Omit<T, K>>
type NewStateDatum<T extends ObjectStateDatumBase> = PartiallyPartial<T, keyof ObjectStateDatumBase>

export function useObjectState<
  T,
  S extends ObjectStateDatumBase,
  E extends { id: string; zIndex: number } = ObjectState<S>
>(
  input: Ref<InputObjects<T>>,
  config: ObjectConfigs<T>,
  selected: Reactive<Set<string>>,
  hovered: Reactive<Set<string>>,
  createState: (obj: Ref<Objects<T>>, id: string, state: NewStateDatum<S>) => void,
  terminateState?: (id: string, state: ObjectState<S>) => void,
  entriesForZOrder?: () => E[]
): {
  objects: Ref<Objects<T>>
  states: Record<string, ObjectState<S>>
  zOrderedList: ComputedRef<E[]>
} {
  // Target object translation
  const objects: Ref<Objects<T>> = ref({})
  watch(
    () => (input.value instanceof Array ? input.value : Object.keys(input.value)),
    () => {
      if (isInputRecordType(input.value)) {
        objects.value = input.value
      } else {
        updateObjectDiff(objects.value, Object.fromEntries(input.value.map(i => [i.id, i])))
      }
    },
    { immediate: true }
  )

  // Object states
  const states: Record<string, ObjectState<S>> = reactive({})

  // Handle object added/removed
  watch(
    () => new Set(Object.keys(objects.value)),
    (idSet, prev) => {
      if (!prev) prev = new Set([])
      for (const id of idSet) {
        if (prev.has(id)) continue
        // object added
        createNewState(objects, states, id, false, config, createState)
        // adding to layouts is done by layout handler
      }

      for (const id of prev) {
        if (idSet.has(id)) continue
        // object removed
        selected.delete(id)
        hovered.delete(id)
        terminateState?.(id, states[id] as ObjectState<S>)
        delete states[id]
      }
    },
    { immediate: true }
  )

  // Object selection
  // - update `{obj}.selected` flag
  watch(
    () => [...selected],
    (nodes, prev) => {
      const append = nodes.filter(n => !prev.includes(n))
      const removed = prev.filter(n => !nodes.includes(n))
      append.forEach(id => {
        const state = states[id]
        if (state && !state.selected) state.selected = true
      })
      removed.forEach(id => {
        const state = states[id]
        if (state && state.selected) state.selected = false
      })
    }
  )

  // - update `node.hovered` flag
  watch(
    () => [...hovered],
    (nodes, prev) => {
      const append = nodes.filter(n => !prev.includes(n))
      const removed = prev.filter(n => !nodes.includes(n))
      append.forEach(id => {
        const state = states[id]
        if (state && !state.hovered) state.hovered = true
      })
      removed.forEach(id => {
        const state = states[id]
        if (state && state.hovered) state.hovered = false
      })
    }
  )

  // z-order
  // z-index applied Object List
  const zOrderedList = computed(() => {
    const list: E[] = entriesForZOrder ? entriesForZOrder() : (Object.values(states) as E[])
    if (config.zOrder.enabled) {
      return makeZOrderedList(list, config.zOrder, hovered, selected)
    } else {
      return list
    }
  })

  return { objects, states, zOrderedList }
}

function createNewState<T, S extends ObjectStateDatumBase>(
  objects: Ref<Objects<T>>,
  states: Record<string, ObjectState<S>>,
  id: string,
  selected: boolean,
  config: ObjectConfigs<T>,
  createState: (obj: Ref<Objects<T>>, id: string, state: NewStateDatum<S>) => void
) {
  const stateObject = <NewStateDatum<S>>{
    id,
    selected,
    hovered: false,
    selectable: computed(() => {
      if (!objects.value[id]) return unref(stateObject.selectable) // Return the previous value
      return Config.value(config.selectable, objects.value[id])
    }),
    zIndex: computed(() => {
      if (!objects.value[id]) return unref(stateObject.zIndex) // Return the previous value
      return Config.value(config.zOrder.zIndex, objects.value[id])
    }),
  }
  states[id] = stateObject as ObjectState<S>
  createState(objects, id, states[id] as NewStateDatum<S> /* get reactive object */)
}

function makeZOrderedList<S extends { id: string; zIndex: number }, T>(
  states: S[],
  zOrder: ZOrderConfig<T>,
  hovered: Reactive<Set<string>>,
  selected: Reactive<Set<string>>
) {
  if (zOrder.bringToFrontOnHover && zOrder.bringToFrontOnSelected) {
    return states.sort((a, b) => {
      const hover1 = hovered.has(a.id)
      const hover2 = hovered.has(b.id)
      if (hover1 != hover2) {
        return hover1 ? 1 : -1
      }
      const selected1 = selected.has(a.id)
      const selected2 = selected.has(b.id)
      if (selected1 != selected2) {
        return selected1 ? 1 : -1
      }
      return a.zIndex - b.zIndex
    })
  } else if (zOrder.bringToFrontOnHover) {
    return states.sort((a, b) => {
      const hover1 = hovered.has(a.id)
      const hover2 = hovered.has(b.id)
      if (hover1 != hover2) {
        return hover1 ? 1 : -1
      }
      return a.zIndex - b.zIndex
    })
  } else if (zOrder.bringToFrontOnSelected) {
    return states.sort((a, b) => {
      const selected1 = selected.has(a.id)
      const selected2 = selected.has(b.id)
      if (selected1 != selected2) {
        return selected1 ? 1 : -1
      }
      return a.zIndex - b.zIndex
    })
  } else {
    return states.sort((a, b) => {
      return a.zIndex - b.zIndex
    })
  }
}
