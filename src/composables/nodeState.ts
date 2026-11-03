// The states of nodes

import type { Ref } from "vue"
import { toRef, unref, watchEffect } from "vue"
import { Reactive } from "@/common/common"
import { Config, NodeConfig } from "@/common/configs"
import { Edges, FixablePosition, Layouts, Node, Nodes, UserLayouts } from "@/common/types"
import * as NodeModel from "@/models/node"
import { updateObjectDiff } from "@/utils/object"
import { computedOfObject } from "./objectState"

/**
 * Make the opposite nodes of each node, by the edges between them.
 * @param nodes the nodes
 * @param edges the edges
 * @returns `{ nodeId: { edgeId: opposingNodeId } }`
 */
export function makeOpposingNodes(nodes: Ref<Nodes>, edges: Ref<Edges>) {
  const opposingNodes = Reactive<Record<string, Record<string, string>>>({})
  watchEffect(() => {
    const _nodes = Object.fromEntries(
      Object.keys(nodes.value).map(k => [k, {} as Record<string, string>])
    )
    Object.entries(edges.value).forEach(([id, e]) => {
      if (!_nodes[e.source]) _nodes[e.source] = {}
      if (!_nodes[e.target]) _nodes[e.target] = {}
      _nodes[e.source][id] = e.target
      _nodes[e.target][id] = e.source
    })
    updateObjectDiff(opposingNodes, _nodes)
  })
  return opposingNodes
}

export function createNewNodeState(
  nodes: Ref<Nodes>,
  id: string,
  state: NodeModel.NodeStateDatum,
  config: NodeConfig,
  oppositeNodeIds: Reactive<Record<string, Record<string, string>>>,
  layouts: Reactive<Layouts>,
  givenLayouts: () => Readonly<UserLayouts>
) {
  // Deleted nodes will lose their position. If it is not a two-way binding,
  // the position remains in the layout specified by the user and is reacquired.
  /* eslint-disable no-restricted-syntax -- takes the given position as it is */
  const given = givenLayouts().nodes?.[id]
  if (!layouts.nodes[id] && given) {
    // The given object itself, as when the layouts were first taken, so that it keeps following it.
    // A readonly one stays readonly, as a reactive object keeps it.
    layouts.nodes[id] = <FixablePosition>given
  }
  /* eslint-enable no-restricted-syntax */

  state.shape = computedOfObject(nodes, id, node =>
    getNodeShape(node, state.selected, state.hovered, config)
  )
  state.staticShape = computedOfObject(nodes, id, node =>
    getNodeStaticShape(node, state.selected, config)
  )
  state.label = computedOfObject(nodes, id, node => Config.values(config.label, node))
  state.labelText = computedOfObject(nodes, id, node =>
    config.label.text instanceof Function
      ? unref(state.label).text
      : (node[unref(state.label).text] ?? "")
  )
  state.draggable = computedOfObject(nodes, id, node => Config.value(config.draggable, node))

  state.oppositeNodeIds = toRef(oppositeNodeIds, id)
}

function getNodeShape(node: Node, selected: boolean, hovered: boolean, config: NodeConfig) {
  if (hovered && config.hover) {
    return Config.values(config.hover, node)
  } else {
    return getNodeStaticShape(node, selected, config)
  }
}

function getNodeStaticShape(node: Node, selected: boolean, config: NodeConfig) {
  // get shape without hovered state
  if (selected) {
    return Config.values(config.selected, node)
  } else {
    return Config.values(config.normal, node)
  }
}
