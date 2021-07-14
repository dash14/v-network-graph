import { provide, inject, InjectionKey } from "@vue/runtime-core"
import mitt, { Emitter } from "mitt"
import { Events, nonNull } from "@/common/types"

const eventEmitterKey = Symbol("emitter") as InjectionKey<Emitter<Events>>

export function provideEventEmitter(): Emitter<Events> {
  // event bus
  const emitter = mitt<Events>()
  provide(eventEmitterKey, emitter)
  return emitter
}

export function useEventEmitter() {
  return {
    emitter: nonNull(inject(eventEmitterKey), "event emitter"),
  }
}
