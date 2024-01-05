
# v-network-graph

An interactive SVG based network-graph visualization component for Vue 3.

<br/>

![the logo of v-network-graph](./public/main-logo-light.svg#gh-light-mode-only)
![the logo of v-network-graph](./public/main-logo-dark.svg#gh-dark-mode-only)

[Live examples](https://dash14.github.io/v-network-graph/examples/)


[![Version](https://img.shields.io/npm/v/v-network-graph.svg)](https://www.npmjs.com/package/v-network-graph)
![GitHub package.json dependency version](https://img.shields.io/github/package-json/dependency-version/dash14/v-network-graph/dev/@vue/compiler-sfc?label=Vue)
[![License](https://img.shields.io/npm/l/v-network-graph.svg)](https://www.npmjs.com/package/v-network-graph)
[![npm bundle size](https://img.shields.io/bundlephobia/minzip/v-network-graph)](https://www.npmjs.com/package/v-network-graph)
[![MadeWithVueJs.com shield](https://madewithvuejs.com/storage/repo-shields/3359-shield.svg)](https://madewithvuejs.com/p/v-network-graph/shield-link)

## Features

* Create a graph according your reactive data dynamically
* Fully configurable appearance
* SVG based
* Pan and zoom viewport
* Drag nodes
* Multiple node selection
* Multiple edge selection
* Multi-touch support
* Various events are provided
* Export as SVG text

## Documentation

* [v-network-graph GitHub Pages](https://dash14.github.io/v-network-graph/)
  * [Getting Started](https://dash14.github.io/v-network-graph/getting-started.html)
  * [Examples](https://dash14.github.io/v-network-graph/examples/)
  * [Reference](https://dash14.github.io/v-network-graph/reference.html)

## Installation

Install with npm

```sh
npm install v-network-graph
```

and setup in main.ts

```ts
// main.ts
import { createApp } from "vue"
import VNetworkGraph from "v-network-graph"
import "v-network-graph/lib/style.css"
import App from "./App.vue"

const app = createApp(App)

app.use(VNetworkGraph)
app.mount("#app")
```

## Installation on Nuxt 3 project


Add css to `nuxt.config.ts`

```ts
// nuxt.config.ts
import { defineNuxtConfig } from "nuxt3"

// https://v3.nuxtjs.org/docs/directory-structure/nuxt.config
export default defineNuxtConfig({
  css: ["v-network-graph/lib/style.css"],
})
```

Make the plugin to `plugins/v-network-graph.ts`

```ts
// plugins/v-network-graph.ts
import { defineNuxtPlugin } from "#app"
import VNetworkGraph from "v-network-graph"

export default defineNuxtPlugin(nuxtApp => {
  nuxtApp.vueApp.use(VNetworkGraph)
})
```

## Basic usage

```vue
<script setup lang="ts">
  const nodes = {
    node1: { name: "Node 1" },
    node2: { name: "Node 2" },
    node3: { name: "Node 3" },
    node4: { name: "Node 4" },
  }
  const edges = {
    edge1: { source: "node1", target: "node2" },
    edge2: { source: "node2", target: "node3" },
    edge3: { source: "node3", target: "node4" },
  }
</script>

<template>
  <v-network-graph
    class="graph"
    :nodes="nodes"
    :edges="edges"
  />
</template>

<style>
.graph {
  width: 800px;
  height: 600px;
  border: 1px solid #000;
}
</style>
```

For more examples, see [here](https://dash14.github.io/v-network-graph/examples/).

## Motivation and Design Policy

The requirements for visualizing network graphs are various, including
the design and user actions for each component such as nodes, edges,
paths, etc.
Many libraries have been made to flexibly achieve these numerous
requirements. However, many of these libraries have been around since
before Vue was launched, so there are not many libraries that can be
used with the concept of reactive programming. This means that using
these libraries together with Vue, you need to learn how to use the
graph libraries as well as Vue, and also having to design the
integration with Vue. These are probably a lot of efforts.

This component aims to make it easy to realize applications with these
various requirements while keeping the simplicity and reactive
programming style of Vue. Using the power of Vue (especially reactive
system and two-way binding), we hope to help developers quickly
visualize interactively manipulable network graphs with less code and
lower learning costs.

v-network-graph was designed with the following policy:

* Reactive

    All primitive data such as nodes, edges, node positions, and
    their styles are provided from outside the component, and the
    component can handle these data reactively with Vue. The
    developer can modify the data at any time to reactively perform
    manipulations such as adding/removing objects, moving node
    positions, changing appearance, etc.

* Highly customizable

    For visualizations, where the requirements vary widely from each
    application, it will be available a variety of customizations
    for ease of use. In addition to static specifications, it also
    supports dynamic changes due to the values ​​of fields contained
    in node and edge data.

* Extendable

    Network graphs have many types of visualization objects, and in
    many cases there are application-specific requirements. It is
    difficult to cover all the requirements with pre-defined
    functions. Therefore, we also implement a mechanism that allows
    developers to flexibly add their own SVG elements and actions
    as needed.

With the above, we would like to contribute to helping application
developers to focus on developing application-specific requirements
for handling network graphs.

## Roadmap to v1.0 📜

Currently, working on internal refactoring, and implementing the
following features.

* Performance improvement when using large network graphs
* More flexible edge enhancement and customization
  * Enables flexible replacement of straight lines, bezier curves,
    whether animation specifications, etc.
  * Includes support for self-loop edge
    (Some features are already available)
* More flexible label display customization
  * ✅ Adjustments node label position automatically
  * As the edges extend, the label must also extend more flexibly
  * Supports display of labels on self-loop edges
  * ✅ Allows changing the z-order between labels and other objects
* ✅ Simpler css class name specification overall
  * To make it easier to override the design
* Other minor improvements
* Enrich related documentation

These are planned to be released in phases, but since this is a
personal project for dash14 and is ongoing on the side of other
commercial work, I cannot give a detailed timeline.  
Your support is especially encouraging!  
I' d appreciate it if you could support this project with a GitHub
starring, an issue/PR submission, a code contribution, a message of
cheer, a sponsorship, or anything else!

## Contributing

If you find any bugs and/or want to contribute, feel free to submit issues or pull requests.

## License

Under the MIT license.  
See [LICENSE](https://github.com/dash14/v-network-graph/blob/main/LICENSE) file for more details.

## Support me 🌟

I love to hear from people using it, giving me the motivation to keep working on this project.  
If you find this library helpful, please consider giving it a star ⭐ on GitHub!

You may [GitHub Sponsors](https://github.com/sponsors/dash14) or
[Buy Me a Coffee](https://www.buymeacoffee.com/dash14.ack) if you would like to show
some support for this open-source project.
It will be greatly appreciated!

[!["Github Sponsors"](https://img.shields.io/badge/sponsor-30363D?style=for-the-badge&logo=GitHub-Sponsors&logoColor=#EA4AAA)](https://github.com/sponsors/dash14)

[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/dash14.ack)
