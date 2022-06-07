import { nextTick, ref } from "vue"

type TimingFunction = "ease" | "linear" | "ease-in" | "ease-out" | "ease-in-out" | string

/** Parameters of transition */
interface TransitionParameters {
  enabled: boolean
  duration: number
  timingFunction: TimingFunction
}

type Function = () => void | Promise<void>

function isPromise(obj: any): boolean {
  return obj instanceof Promise || (obj && typeof obj.then === "function")
}

export function useTransitionWhile() {
  let timerId: number | null = null
  const transitionOption = ref<TransitionParameters>({
    enabled: false,
    duration: 300,
    timingFunction: "linear"
  })

  function transitionWhile(
    func: Function,
    duration: number = 300,
    timingFunction: TimingFunction = "linear"
  ) {
    if (timerId) {
      clearTimeout(timerId)
      timerId = null
    }
    transitionOption.value = {
      enabled: true,
      duration,
      timingFunction
    }

    nextTick(async () => {
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

