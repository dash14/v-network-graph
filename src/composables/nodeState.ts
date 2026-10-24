// The states of nodes

import type { Ref } from "vue"
import { computed, toRef, unref, watchEffect } from "vue"
import { Reactive } from "@/common/common"
import { Config, NodeConfig, OppositeNode } from "@/common/configs"
import { Edges, FixablePosition, Layouts, Node, Nodes, UserLayouts } from "@/common/types"
import * as NodeModel from "@/models/node"
import { positionOf } from "@/modules/node/position"
import { updateObjectDiff } from "@/utils/object"

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
      if (!_nodes?.[e.source]) _nodes[e.source] = {}
      if (!_nodes?.[e.target]) _nodes[e.target] = {}
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

  state.shape = computed(() => {
    if (!nodes.value[id]) return unref(state.shape) // Return the previous value
    return getNodeShape(nodes.value[id], state.selected, state.hovered, config)
  })

  state.staticShape = computed(() => {
    if (!nodes.value[id]) return unref(state.staticShape) // Return the previous value
    return getNodeStaticShape(nodes.value[id], state.selected, config)
  })

  state.label = computed(() => {
    if (!nodes.value[id]) return unref(state.label) // Return the previous value
    return Config.values(config.label, nodes.value[id])
  })

  state.labelText = computed(() => {
    if (config.label.text instanceof Function) {
      return unref(state.label).text
    } else {
      if (!nodes.value[id]) return unref(state.labelText) // Return the previous value
      return nodes.value[id]?.[unref(state.label).text] ?? ""
    }
  })

  state.draggable = computed(() => {
    if (!nodes.value[id]) return unref(state.draggable) // Return the previous value
    return Config.value(config.draggable, nodes.value[id])
  })

  state.oppositeNodeIds = toRef(oppositeNodeIds, id)

  state.oppositeNodes = computed<Record<string, OppositeNode>>(() => {
    return Object.entries(state.oppositeNodeIds).reduce(
      (nodes, entry) => {
        const [edgeId, nodeId] = entry as [string, string]
        if (nodeId in layouts.nodes)
          nodes[edgeId] = { nodeId, pos: positionOf(layouts.nodes, nodeId) }
        return nodes
      },
      {} as Record<string, OppositeNode>
    )
  })
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
