import type { ComputedRef, Slot } from "vue"
import { computed } from "vue"
import { uniq } from "lodash-es"
import { Configs } from "@/common/configs"
import { LayerName } from "@/common/types"
import { pairwise } from "@/modules/collection/iterate"
import { insertAfter, removeItem } from "@/modules/collection/array"

export interface LayerSlotProps {
  scale: number
}
export type LayerSlots = Record<string, Slot<LayerSlotProps>>

export function useBuiltInLayerOrder<T extends Configs>(
  configs: T,
  slots: Readonly<LayerSlots>
): ComputedRef<LayerName[]> {
  const builtInLayers: Readonly<LayerName[]> = [
    "edges",
    "edge-labels",
    "focusring",
    "nodes",
    "node-labels",
    "paths",
  ] as const

  return computed<LayerName[]>(() => {
    const request = uniq(configs.view.builtInLayerOrder)
      .filter(layer => {
        const defined = builtInLayers.includes(layer)
        if (!defined) {
          console.warn(`Layer ${layer} is not a built-in layer.`)
        }
        return defined
      })
      .reverse()
    const order = [...builtInLayers]
    pairwise(request, (lower, higher) => {
      removeItem(order, higher)
      insertAfter(order, lower, higher)
    })

    // Remove unused layers
    if (!("edge-label" in slots || "edges-label" in slots)) {
      removeItem(order, "edge-labels")
    }
    if (!configs.node.focusring.visible) {
      removeItem(order, "focusring")
    }
    if (configs.node.label.visible === false) {
      removeItem(order, "node-labels")
    }
    if (!configs.path.visible) {
      removeItem(order, "paths")
    }

    return order
  })
}
