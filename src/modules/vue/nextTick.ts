import { nextTick } from "vue"

export const asyncNextTick = () => {
  return new Promise((resolve) => nextTick(resolve as () => void))
}
