import { uniq } from "lodash-es"
import type { ComputedRef, MaybeRefOrGetter, Slot } from "vue"
import { computed, toValue } from "vue"
import { Configs } from "@/common/configs"
import { LayerName, LayerPosition, LayerPositions, Layers } from "@/common/types"
import { insertAfter, removeItem } from "@/modules/collection/array"
import { pairwise } from "@/modules/collection/iterate"

export interface LayerSlotProps {
  scale: number
}
export type LayerSlots = Record<string, Slot<LayerSlotProps>>

const BUILT_IN_LAYERS: Readonly<LayerName[]> = [
  "edges",
  "edge-labels",
  "focusring",
  "nodes",
  "node-labels",
  "paths",
] as const

/** The slots of VNetworkGraph that are not layers. */
export const GRAPH_SYSTEM_SLOTS = [
  "override-node",
  "override-node-label",
  "edge-overlay",
  "edge-label",
  "edges-label",
] as const

export function useBuiltInLayerOrder<T extends Configs>(
  configs: T,
  slotNames: MaybeRefOrGetter<readonly string[]>,
  builtInLayers: Readonly<LayerName[]> = BUILT_IN_LAYERS
): ComputedRef<LayerName[]> {
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
    const names = toValue(slotNames)
    if (!(names.includes("edge-label") || names.includes("edges-label"))) {
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

/**
 * Sort the user's layers into the positions they are drawn at.
 * @param configs the configs of the graph
 * @param slotNames the names of the slots given to the graph
 * @param layers the layers given in the props
 * @param systemSlots the slots of the graph that are not layers
 * @returns the names of the layers at each position, and whether the grid and the background are
 * shown
 */
export function useLayerDefs(
  configs: Configs,
  slotNames: MaybeRefOrGetter<readonly string[]>,
  layers: () => Layers,
  systemSlots: Readonly<string[]>
) {
  const layerDefs = computed(() => {
    const definedSlots = new Set(toValue(slotNames))
    systemSlots.forEach(s => definedSlots.delete(s))

    const layerNames = Object.fromEntries(LayerPositions.map(n => [n, [] as string[]]))
    Object.assign(
      layerNames,
      Object.entries(layers()).reduce(
        (accum, [name, type]) => {
          if (systemSlots.includes(name)) return accum
          definedSlots.delete(name)
          if (type in accum) {
            accum[type].push(name)
          } else {
            accum[type] = [name]
          }
          return accum
        },
        {} as Record<LayerPosition, string[]>
      )
    )
    // The default slot and any slots not defined in the layers into root.
    layerNames["root"].push(...definedSlots)
    return layerNames as Record<LayerPosition, string[]>
  })

  // Grid layer
  const isShowGrid = computed(() => configs.view.grid.visible)
  const isShowBackgroundViewport = computed(() => {
    const layers = layerDefs.value
    return isShowGrid.value || layers["background"].length > 0 || layers["grid"].length > 0
  })

  return { layerDefs, isShowGrid, isShowBackgroundViewport }
}
