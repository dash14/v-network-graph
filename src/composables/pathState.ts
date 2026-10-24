// The states of paths

import { isEqual } from "lodash-es"
import type { Ref } from "vue"
import { computed, watchEffect } from "vue"
import { Config, PathConfig } from "@/common/configs"
import { Edges, Path, Paths } from "@/common/types"
import * as EdgeModel from "@/models/edge"
import * as PathModel from "@/models/path"
import { calculateDirectionsOfPathEdges } from "@/modules/calculation/path"

export function createNewPathState(
  paths: Ref<Paths>,
  id: string,
  state: PathModel.PathStateDatum,
  config: PathConfig,
  edges: Ref<Edges>,
  edgeGroupStates: EdgeModel.EdgeGroupStates
) {
  state.clickable = computed(() => {
    if (!paths.value[id]) return false
    return Config.value(config.clickable, paths.value[id])
  })
  state.hoverable = computed(() => {
    if (!paths.value[id]) return false
    return Config.value(config.hoverable, paths.value[id])
  })

  // Follows the edges of the path and their source and target.
  state.stopWatchHandle = watchEffect(() => {
    if (!paths.value[id]) return
    state.path = paths.value[id]
    const pathEdges = toEdgeObjects(state.path, edges, edgeGroupStates)
    // Keep the arrays when unchanged, so that the path is not redrawn.
    if (!isEqual(pathEdges, state.edges)) state.edges = pathEdges
    const directions = calculateDirectionsOfPathEdges(pathEdges)
    if (!isEqual(directions, state.directions)) state.directions = directions
  })
}

function toEdgeObjects(path: Path, edges: Ref<Edges>, edgeGroupStates: EdgeModel.EdgeGroupStates) {
  // The path skips the edges that are not drawn, such as those to missing nodes.
  return path.edges
    .map(edgeId => ({ edgeId, edge: edges.value[edgeId] }))
    .filter(e => e.edge && e.edgeId in edgeGroupStates.edgeLayoutPoints)
}
