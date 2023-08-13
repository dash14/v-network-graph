import { ForceLayout } from "./layouts/force"

if ((globalThis as any)["VNetworkGraph"]) {
  Object.assign((globalThis as any)["VNetworkGraph"], {
    ForceLayout,
  })
}

export default {
  ForceLayout,
}
