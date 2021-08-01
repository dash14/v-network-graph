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


// // iife/cjs usage extends esm default export - so import it all
// import plugin, * as components from '.';

// // Attach named exports directly to plugin. IIFE/CJS will
// // only expose one global var, with component exports exposed as properties of
// // that global var (eg. plugin.component)
// type NamedExports = Exclude<typeof components, 'default'>;
// type ExtendedPlugin = typeof plugin & NamedExports;
// Object.entries(components).forEach(([componentName, component]) => {
//   if (componentName !== 'default') {
//     const key = componentName as Exclude<keyof NamedExports, 'default'>;
//     const val = component as Exclude<ExtendedPlugin, typeof plugin>;
//     (plugin as ExtendedPlugin)[key] = val;
//   }
// });

// export default plugin;