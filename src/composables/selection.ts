import type { InjectionKey } from "vue"
import { inject, provide } from "vue"
import { nonNull, Reactive } from "@/common/common"

interface Selections {
  selectedNodes: Reactive<Set<string>>
  selectedEdges: Reactive<Set<string>>
  selectedPaths: Reactive<Set<string>>
}

const injectionKey = Symbol("selection") as InjectionKey<Selections>

export function provideSelections(
  selectedNodes: Reactive<Set<string>>,
  selectedEdges: Reactive<Set<string>>,
  selectedPaths: Reactive<Set<string>>
) {
  provide(injectionKey, {
    selectedNodes,
    selectedEdges,
    selectedPaths,
  })
}

export function useSelections(): Selections {
  return nonNull(inject(injectionKey), "Selections")
}
