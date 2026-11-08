// Management states of objects

import type { ComputedRef, Ref, UnwrapRef } from "vue"
import { computed, reactive, watch } from "vue"
import { Reactive } from "@/common/common"
import { Config, ObjectConfigs, ZOrderConfig } from "@/common/configs"

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
  E extends { id: string; zIndex: number } = ObjectState<S>,
>(
  objects: Ref<Record<string, T>>,
  config: ObjectConfigs<T>,
  selected: Reactive<Set<string>>,
  hovered: Reactive<Set<string>>,
  createState: (obj: Ref<Objects<T>>, id: string, state: NewStateDatum<S>) => void,
  terminateState?: (id: string, state: ObjectState<S>) => void,
  entriesForZOrder?: () => E[]
): {
  states: Record<string, ObjectState<S>>
  zOrderedList: ComputedRef<E[]>
} {
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
    (objects, prev) => {
      const append = prev ? objects.filter(n => !prev.includes(n)) : objects
      const removed = prev ? prev.filter(n => !objects.includes(n)) : []
      // Objects changed in place without reactivity have no state yet, so their IDs are dropped
      // like those of no object.
      append.forEach(id => {
        const state = states[id]
        if (state) state.selected = true
        else selected.delete(id)
      })
      removed.forEach(id => {
        const state = states[id]
        if (state) state.selected = false
      })
    },
    { immediate: true } // for specified from the beginning
  )

  // - update `node.hovered` flag
  watch(
    () => [...hovered],
    (nodes, prev) => {
      const append = nodes.filter(n => !prev.includes(n))
      const removed = prev.filter(n => !nodes.includes(n))
      // An object is hovered only while it is drawn, so each one added has its state.
      append.forEach(id => (states[id].hovered = true))
      removed.forEach(id => {
        const state = states[id]
        if (state) state.hovered = false
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

  return { states, zOrderedList }
}

/**
 * A value computed from an object, which keeps the last one once the object is removed.
 * @param objects the objects
 * @param id the ID of the object
 * @param compute makes the value from the object
 * @returns the computed value
 */
export function computedOfObject<T, R>(
  objects: Ref<Objects<T>>,
  id: string,
  compute: (object: T) => R
): ComputedRef<R> {
  let last: R
  return computed(() => {
    const object = objects.value[id]
    // The state is dropped with its object, before anything reads it again.
    /* v8 ignore else */
    if (object) last = compute(object)
    return last
  })
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
    selectable: computedOfObject(objects, id, o => Config.value(config.selectable, o)),
    zIndex: computedOfObject(objects, id, o => Config.value(config.zOrder.zIndex, o)),
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
  // The hovered in front of the rest, then the selected, and by the z-index within each.
  const front = (set: Reactive<Set<string>>, a: S, b: S) =>
    Number(set.has(a.id)) - Number(set.has(b.id))
  return states.sort(
    (a, b) =>
      (zOrder.bringToFrontOnHover ? front(hovered, a, b) : 0) ||
      (zOrder.bringToFrontOnSelected ? front(selected, a, b) : 0) ||
      a.zIndex - b.zIndex
  )
}
