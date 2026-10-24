// The states of edges

import type { Ref } from "vue"
import { computed, unref, watchEffect } from "vue"
import { Reactive } from "@/common/common"
import { Config, Configs, EdgeConfig, MarkerStyle, StrokeStyle } from "@/common/configs"
import { Edge, Edges } from "@/common/types"
import type { EdgePlacement } from "@/composables/edgePlacement"
import * as EdgeModel from "@/models/edge"
import { MarkerState, useMarker } from "./marker"

const NONE_MARKER: MarkerStyle = {
  type: "none",
  width: 0,
  height: 0,
  margin: 0,
  offset: 0,
  units: "strokeWidth",
  color: null,
}

export function createNewEdgeState(
  edges: Ref<Edges>,
  id: string,
  state: EdgeModel.EdgeStateDatum,
  config: EdgeConfig,
  makerState: MarkerState,
  instanceId: string,
  placement: EdgePlacement
) {
  const { makeMarker, clearMarker } = useMarker(makerState)

  state.label = computed(() => {
    if (!edges.value[id]) return unref(state.label) // Return the previous value
    return Config.values(config.label, edges.value[id])
  })

  const line = computed<EdgeModel.Line>(() => {
    const edge = edges.value[id]
    const stroke = getEdgeStroke(edge, state.selected, state.hovered, config)
    // Minimum error checking required for drawing
    if (isNaN(+stroke.width)) {
      console.warn(
        "[v-network-graph] Edge width is invalid value. id=[%s] value=[%s]",
        id,
        stroke.width
      )
      stroke.width = 1
    }
    if (stroke.color === undefined || stroke.color === null) {
      console.warn(
        "[v-network-graph] Edge color is invalid value. id=[%s] value=[%s]",
        id,
        stroke.color
      )
      stroke.color = "#000000"
    }
    let normalWidth = Config.value(config.normal.width, edge)
    if (isNaN(+normalWidth)) {
      normalWidth = 1
    }
    const source = toEdgeMarker(Config.values(config.marker.source, [edge, stroke]))
    const target = toEdgeMarker(Config.values(config.marker.target, [edge, stroke]))
    return { stroke, normalWidth, source, target }
  })
  state.line = line
  const stopPlacing = placement.startPlacing(id, state, line)

  const stopUpdateMarkerHandle = watchEffect(() => {
    if (!edges.value[id]) return
    state.sourceMarkerId = makeMarker(
      line.value.source,
      true /* isSource */,
      state.sourceMarkerId,
      line.value.stroke.color,
      instanceId
    )
    state.targetMarkerId = makeMarker(
      line.value.target,
      false /* isSource */,
      state.targetMarkerId,
      line.value.stroke.color,
      instanceId
    )
  })

  state.stopWatchHandle = () => {
    stopPlacing()
    stopUpdateMarkerHandle()
    clearMarker(state.sourceMarkerId)
    clearMarker(state.targetMarkerId)
  }
}

export function createEdgeEntries(
  edgeGroups: Record<string, EdgeModel.EdgeGroup>,
  edgeStates: EdgeModel.EdgeStates
) {
  return Object.entries(edgeGroups)
    .map(([key, group]) => {
      if (group.summarize) {
        return <EdgeModel.SummarizedEdgeItem>{
          id: Object.keys(group.edges)[0] ?? key,
          summarized: true,
          key,
          group,
          zIndex: Object.keys(group.edges)
            .map(id => edgeStates[id]?.zIndex ?? 0)
            .reduce((s, z) => Math.max(s, z)),
        }
      } else {
        return Object.entries(group.edges).map(
          ([id, edge]) =>
            <EdgeModel.SingleEdgeItem>{
              id,
              summarized: false,
              key: id,
              edge,
              zIndex: edgeStates[id]?.zIndex ?? 0,
            }
        )
      }
    })
    .flat()
}

export function createSummarizedEdgeStates(
  summarizedEdgeStates: EdgeModel.SummarizedEdgeStates,
  edgeGroupStates: Reactive<EdgeModel.EdgeGroupStates>,
  configs: Configs
) {
  const groups = edgeGroupStates.edgeGroups
  Object.entries(groups)
    .filter(([id, group]) => group.summarize && !(id in summarizedEdgeStates))
    .forEach(([id, group]) => {
      const state = { stroke: undefined as any }
      state.stroke = computed<StrokeStyle>(() =>
        Config.values(configs.edge.summarized.stroke, group.edges)
      )
      summarizedEdgeStates[id] = state
    })
  Object.keys(summarizedEdgeStates).forEach(id => {
    if (!edgeGroupStates.edgeGroups[id]?.summarize) {
      delete summarizedEdgeStates[id]
    }
  })
}

function getEdgeStroke(edge: Edge, selected: boolean, hovered: boolean, config: EdgeConfig) {
  if (selected) {
    return Config.values(config.selected, edge)
  } else if (hovered && config.hover) {
    return Config.values(config.hover, edge)
  } else {
    return Config.values(config.normal, edge)
  }
}

function toEdgeMarker(marker: MarkerStyle): MarkerStyle {
  if (marker.type === "none") {
    return NONE_MARKER
  } else {
    return marker
  }
}
