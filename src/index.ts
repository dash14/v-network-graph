import { App, Plugin } from "vue"

// Import vue components
import * as components from "./components/index"

// install function executed by Vue.use()
const install: Exclude<Plugin["install"], undefined> = function (app: App) {
  Object.entries(components).forEach(([componentName, component]) => {
    app.component(componentName, component)
  })
}

// Create module definition for Vue.use()
export default install

export type VNetworkGraphInstance = InstanceType<typeof components.VNetworkGraph>
export type Instance = InstanceType<typeof components.VNetworkGraph>

// To allow individual component use, export components
// each can be registered via Vue.component()
export * from "./components/index"

export { getFullConfigs } from "./common/config-defaults"

export { SimpleLayout } from "./layouts/simple"
export { GridLayout } from "./layouts/grid"
// export { ForceLayout } from "./layouts/force"
export type { LayoutHandler } from "./layouts/handler"

export * from "./common/types"
export * from "./common/configs"
export { Vector2D } from "./modules/vector2d"

// Export for more advanced visualization. However, be aware of the
// possibility of destructive specification changes in the future.
export { useStates } from "./composables/state"

export type { Box } from "./modules/svg-pan-zoom-ex"
