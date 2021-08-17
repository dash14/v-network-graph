
# v-network-graph

An interactive SVG based network-graph visualization component for Vue 3.

<p align="center">
  <br>
  <img src="./public/logo.svg" alt="logo of v-network-graph" width="222" height="132">
</p>

[Live examples](https://dash14.github.io/v-network-graph/examples/)


[![Version](https://img.shields.io/npm/v/v-network-graph.svg)](https://www.npmjs.com/package/v-network-graph)
![GitHub package.json dependency version](https://img.shields.io/github/package-json/dependency-version/dash14/v-network-graph/dev/@vue/compiler-sfc?label=Vue)
[![License](https://img.shields.io/npm/l/v-network-graph.svg)](https://www.npmjs.com/package/v-network-graph)


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

and setup via Vue.use()

```js
import VNetworkGraph from 'v-network-graph'
import 'v-network-graph/style.css'

Vue.use(VNetworkGraph)
```

## Basic usage

```vue
<template>
  <v-network-graph
    :nodes="nodes"
    :edges="edges"
  />
</template>

<script lang="ts">
import { defineComponent } from "vue"

export default defineComponent({
  setup() {
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
    return { nodes, edges }
  },
})
</script>
```

For more examples, see [here](https://dash14.github.io/v-network-graph/examples/).

## Contributing

If you find any bugs and/or want to contribute, feel free to submit issues or pull requests.

## License

Under the MIT license.  
See [LICENSE](https://github.com/dash14/v-network-graph/blob/main/LICENSE) file for more details.
