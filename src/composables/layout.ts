import { inject, InjectionKey, provide, toRaw, watch } from "vue"
import { nonNull, Reactive } from "@/common/common"
import { Layouts, UserLayouts } from "@/common/types"

const injectionKey = Symbol("layouts") as InjectionKey<Reactive<Layouts>>

export function provideLayouts(layouts: Reactive<Layouts>) {
  provide(injectionKey, layouts)
}

export function useLayouts(): Layouts {
  return nonNull(inject(injectionKey), "Layouts")
}

/**
 * Make the layouts the graph draws, following the given ones.
 * @param layouts the layouts given in the props
 * @returns the layouts the graph draws
 */
export function useLayoutsBinding(layouts: () => UserLayouts): Reactive<Layouts> {
  const currentLayouts = Reactive<Layouts>({ nodes: {} })

  provideLayouts(currentLayouts)

  // two-way binding
  // Shallow: the given position objects are taken as they are, so a change of their coordinates
  // reaches the graph without walking them all.
  watch(
    // With v-model the given layouts are the graph's own once emitted, and need no copy.
    () => (toRaw(layouts()) === toRaw(currentLayouts) ? undefined : { ...layouts().nodes }),
    nodes => nodes && Object.assign(currentLayouts.nodes, nodes),
    { immediate: true }
  )

  return currentLayouts
}
