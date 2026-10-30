import type { Ref } from "vue"
import { nextTick, ref } from "vue"

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

function isPromise(obj: any): boolean {
  return obj instanceof Promise || (obj && typeof obj.then === "function")
}

export function useTransitionWhile(): UseTransitionWhileReturn {
  let timerId: number | null = null
  let running = 0
  const transitionOption = ref<TransitionParameters>({
    enabled: false,
    duration: 300,
    timingFunction: "linear",
  })

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

    running++
    nextTick(async () => {
      try {
        const promise = func()
        if (isPromise(promise)) {
          await promise
        }
      } finally {
        // Overlapping calls end together, after the last one finishes.
        running--
        if (running === 0) {
          timerId = window?.setTimeout(() => {
            transitionOption.value.enabled = false
            timerId = null
          }, transitionOption.value.duration)
        }
      }
    })
  }

  return { transitionWhile, transitionOption }
}
