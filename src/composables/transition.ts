import type { InjectionKey, Ref } from "vue"
import { inject, nextTick, provide, readonly, ref } from "vue"

type TimingFunction = "ease" | "linear" | "ease-in" | "ease-out" | "ease-in-out" | string

/** Parameters of transition */
interface TransitionParameters {
  enabled: boolean
  duration: number
  timingFunction: TimingFunction
}

type CallbackFunction = () => void | Promise<void>

export interface UseTransitionWhileReturn {
  transitionWhile: (
    func: CallbackFunction,
    duration?: number,
    timingFunction?: TimingFunction
  ) => void
  transitionOption: Ref<TransitionParameters>
}

const injectionKey = Symbol("transition") as InjectionKey<Readonly<Ref<TransitionParameters>>>

function isPromise(obj: any): boolean {
  return obj instanceof Promise || (obj && typeof obj.then === "function")
}

export function useTransitionWhile(): UseTransitionWhileReturn {
  let timerId: number | null = null
  const transitionOption = ref<TransitionParameters>({
    enabled: false,
    duration: 300,
    timingFunction: "linear",
  })
  provide(injectionKey, readonly(transitionOption))

  function transitionWhile(
    func: CallbackFunction,
    duration = 300,
    timingFunction: TimingFunction = "linear"
  ) {
    if (timerId) {
      clearTimeout(timerId)
      timerId = null
    }
    transitionOption.value = {
      enabled: true,
      duration,
      timingFunction,
    }

    nextTick(async () => {
      // Elements made for the transition need a style to start it from.
      document.documentElement.getBoundingClientRect()
      const promise = func()
      if (isPromise(promise)) {
        await promise
      }

      if (timerId) {
        clearTimeout(timerId)
      }
      timerId = window?.setTimeout(() => {
        transitionOption.value.enabled = false
        timerId = null
      }, duration)
    })
  }

  return { transitionWhile, transitionOption }
}

/** Whether the objects move by a transition of `transitionWhile()` now. */
export function useTransitionEnabled() {
  const option = inject(injectionKey, undefined)
  return () => option?.value.enabled ?? false
}
