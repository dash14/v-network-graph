import { App, Plugin } from "vue"

// Import vue components
import * as components from "./components/index"

// install function executed by Vue.use()
const install: Exclude<Plugin["install"], undefined> = function installVTopology(app: App) {
  Object.entries(components).forEach(([componentName, component]) => {
    app.component(componentName, component)
  })
}

// Create module definition for Vue.use()
export default install

// To allow individual component use, export components
// each can be registered via Vue.component()
export * from "./components/index"

export { STYLE_DEFAULT } from "./components/common/style-defaults"
export { SimpleLayout } from "./components/layouts/simple"
export { GridLayout } from "./components/layouts/grid"
export { ForceLayout } from "./components/layouts/force"
export type { LayoutHandler } from "./components/layouts/handler"
