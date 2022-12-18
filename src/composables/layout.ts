import { inject, InjectionKey, provide } from "vue"
import { nonNull, Reactive } from "@/common/common"
import { Layouts } from "@/common/types"

const injectionKey = Symbol("layouts") as InjectionKey<Reactive<Layouts>>

export function provideLayouts(layouts: Reactive<Layouts>) {
  provide(injectionKey, layouts)
}

export function useLayouts(): Layouts {
  return nonNull(inject(injectionKey), "Layouts")
}
