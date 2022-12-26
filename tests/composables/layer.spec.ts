import { describe, expect, it } from "vitest"
import { Slots } from "vue"
import { useBuiltInLayerOrder } from "@/composables/layer"
import { getFullConfigs } from "@/common/config-defaults"
import { LayerName } from "@/common/types"

function getConfigs() {
  const configs = getFullConfigs({
    view: {
      builtInLayerOrder: [],
    },
    node: {
      label: { visible: true },
      focusring: { visible: true },
    },
    path: { visible: true },
  })
  return configs
}

describe("useBuiltInLayerOrder", () => {
  const slots = {
    "edge-label": {},
    "edges-label": {},
  } as unknown as Slots

  describe("Empty is specified", () => {
    it("should be returned the default order", () => {
      const configs = getConfigs()
      configs.view.builtInLayerOrder = [] // empty

      const layers = useBuiltInLayerOrder(configs, slots)

      const defaultOrder = ["edges", "edge-labels", "focusring", "nodes", "node-labels", "paths"]
      expect(defaultOrder).to.be.eql(layers.value)
    })
  })

  describe("The order of all layers is specified", () => {
    it("should be returned the same as parameter", () => {
      const configs = getConfigs()
      const input: LayerName[] = [
        "paths",
        "edge-labels",
        "edges",
        "nodes",
        "focusring",
        "node-labels",
      ]
      configs.view.builtInLayerOrder = input

      const layers = useBuiltInLayerOrder(configs, slots)

      const reversed = [...input].reverse()
      expect(reversed).to.be.eql(layers.value)
    })
  })

  describe("Partial layers are specified", () => {
    it("should not change position of the specified lowest layer", () => {
      const configs = getConfigs()
      configs.view.builtInLayerOrder = ["node-labels", "paths"]

      const layers = useBuiltInLayerOrder(configs, slots)

      const order = ["edges", "edge-labels", "focusring", "nodes", "paths", "node-labels"]
      expect(order).to.be.eql(layers.value)
    })
  })

  describe("Not specified edge-label/edges-label slot", () => {
    it("should contain edge-labels layer", () => {
      const slots = {
        // "edge-label": {},
        "edges-label": {},
      } as unknown as Slots
      const configs = getConfigs()
      const layers = useBuiltInLayerOrder(configs, slots)
      expect(layers.value.includes("edge-labels")).toBe(true)
    })

    it("should contain edge-labels layer", () => {
      const slots = {
        "edge-label": {},
        // "edges-label": {},
      } as unknown as Slots
      const configs = getConfigs()
      const layers = useBuiltInLayerOrder(configs, slots)
      expect(layers.value.includes("edge-labels")).toBe(true)
    })

    it("should not contain edge-labels layer", () => {
      const slots = {} as unknown as Slots
      const configs = getConfigs()
      const layers = useBuiltInLayerOrder(configs, slots)
      expect(layers.value.includes("edge-labels")).toBe(false)
    })
  })

  describe("Configured the focusring invisible", () => {
    it("should not contain focusring layer", () => {
      const configs = getConfigs()
      configs.node.focusring.visible = false
      const layers = useBuiltInLayerOrder(configs, slots)
      expect(layers.value.includes("focusring")).toBe(false)
    })
  })

  describe("Configured the node labels invisible", () => {
    it("should not contain node-labels layer", () => {
      const configs = getConfigs()
      configs.node.label.visible = false
      const layers = useBuiltInLayerOrder(configs, slots)
      expect(layers.value.includes("node-labels")).toBe(false)
    })
  })

  describe("Configured the path invisible", () => {
    it("should not contain paths layer", () => {
      const configs = getConfigs()
      configs.path.visible = false
      const layers = useBuiltInLayerOrder(configs, slots)
      expect(layers.value.includes("paths")).toBe(false)
    })
  })
})
