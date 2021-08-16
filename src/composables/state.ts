// the states of nodes and edges

import { computed, inject, InjectionKey, provide, reactive, Ref, unref, UnwrapRef, watch } from "vue"
import { nonNull, Reactive } from "../common/common"
import {
  AnyShapeStyle,
  Config,
  Configs,
  EdgeConfig,
  NodeConfig,
  NodeLabelStyle,
  StrokeStyle,
} from "../common/configs"
import { Edge, Edges, Layouts, Node, Nodes } from "../common/types"

interface NodeStateDatum {
  shape: Ref<AnyShapeStyle>
  label: Ref<NodeLabelStyle>
  labelText: Ref<string>
  selected: boolean
  hovered: boolean
}

export type NodeState = UnwrapRef<NodeStateDatum>
export type NodeStates = Record<string, NodeState>

interface EdgeStateDatum {
  stroke: Ref<StrokeStyle>
  selected: boolean
  hovered: boolean
}

export type EdgeState = UnwrapRef<EdgeStateDatum>
export type EdgeStates = Record<string, EdgeState>

interface States {
  nodeStates: NodeStates
  edgeStates: EdgeStates
  layouts: Layouts
}
const statesKey = Symbol("states") as InjectionKey<States>

function getNodeShape(node: Node, selected: boolean, hovered: boolean, config: NodeConfig) {
  if (hovered && config.hover) {
    return Config.values(config.hover, node)
  } else if (selected && config.selected) {
    return Config.values(config.selected, node)
  } else {
    return Config.values(config.normal, node)
  }
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

function createNodeState(
  states: NodeStates,
  nodes: Nodes,
  id: string,
  selected: boolean,
  hovered: boolean,
  config: NodeConfig
) {
  states[id] = { selected, hovered } as any
  const state = states[id] as any as NodeStateDatum
  state.shape = computed(() => getNodeShape(nodes[id], state.selected, state.hovered, config))
  state.label = computed(() => Config.values(config.label, nodes[id]))
  state.labelText = computed(() => {
    if (config.label.text instanceof Function) {
      return unref(state.label).text
    } else {
      return nodes[id][unref(state.label).text] ?? ""
    }
  })
}

function createEdgeState(
  states: EdgeStates,
  edges: Edges,
  id: string,
  selected: boolean,
  hovered: boolean,
  config: EdgeConfig
) {
  states[id] = { selected, hovered } as any
  const state = states[id] as any as EdgeStateDatum
  state.stroke = computed(() => getEdgeStroke(edges[id], state.selected, state.hovered, config))
}

export function provideStates(
  nodes: Readonly<Nodes>,
  edges: Readonly<Edges>,
  selectedNodes: Reactive<Set<string>>,
  selectedEdges: Reactive<Set<string>>,
  hoveredNodes: Reactive<Set<string>>,
  hoveredEdges: Reactive<Set<string>>,
  configs: Readonly<Configs>,
  layouts: Reactive<Layouts>
) {
  const nodeStates: NodeStates = reactive({})
  const edgeStates: EdgeStates = reactive({})

  Object.keys(nodes).forEach(id => {
    createNodeState(nodeStates, nodes, id, selectedNodes.has(id), false, configs.node)
  })
  Object.keys(edges).forEach(id => {
    createEdgeState(edgeStates, edges, id, selectedEdges.has(id), false, configs.edge)
  })

  // update `node.selected` flag
  watch(
    () => [...selectedNodes],
    (nodes, prev) => {
      const append = nodes.filter(n => !prev.includes(n))
      const removed = prev.filter(n => !nodes.includes(n))

      append.forEach(id => {
        const state = nodeStates[id]
        if (state && !state.selected) {
          state.selected = true
        }
      })

      removed.forEach(id => {
        const state = nodeStates[id]
        if (state && state.selected) {
          state.selected = false
        }
      })
    }
  )

  // update `node.hovered` flag
  watch(
    () => [...hoveredNodes],
    (nodes, prev) => {
      const append = nodes.filter(n => !prev.includes(n))
      const removed = prev.filter(n => !nodes.includes(n))

      append.forEach(id => {
        const state = nodeStates[id]
        if (state && !state.hovered) {
          state.hovered = true
        }
      })

      removed.forEach(id => {
        const state = nodeStates[id]
        if (state && state.hovered) {
          state.hovered = false
        }
      })
    }
  )

  // update `edge.selected` flag
  watch(
    () => [...selectedEdges],
    (nodes, prev) => {
      const append = nodes.filter(n => !prev.includes(n))
      const removed = prev.filter(n => !nodes.includes(n))

      append.forEach(id => {
        const state = edgeStates[id]
        if (state && !state.selected) {
          state.selected = true
        }
      })

      removed.forEach(id => {
        const state = edgeStates[id]
        if (state && state.selected) {
          state.selected = false
        }
      })
    }
  )

  // update `edge.hovered` flag
  watch(
    () => [...hoveredEdges],
    (nodes, prev) => {
      const append = nodes.filter(n => !prev.includes(n))
      const removed = prev.filter(n => !nodes.includes(n))

      append.forEach(id => {
        const state = edgeStates[id]
        if (state && !state.hovered) {
          state.hovered = true
        }
      })

      removed.forEach(id => {
        const state = edgeStates[id]
        if (state && state.hovered) {
          state.hovered = false
        }
      })
    }
  )

  // handle increase/decrease nodes
  watch(
    () => new Set(Object.keys(nodes)),
    (idSet, prev) => {
      for (const nodeId of idSet) {
        if (prev.has(nodeId)) continue
        // node append
        createNodeState(nodeStates, nodes, nodeId, false, false, configs.node)
        // layoutsへの追加はlayout handlerが行う
      }

      const positions = layouts.nodes
      for (const nodeId of prev) {
        if (idSet.has(nodeId)) continue
        // node removed
        delete positions[nodeId]
        selectedNodes.delete(nodeId)
        hoveredNodes.delete(nodeId)
        delete nodeStates[nodeId]
      }
    }
  )

  // handle increase/decrease edges
  watch(
    () => new Set(Object.keys(edges)),
    (idSet, prev) => {
      for (const edgeId of idSet) {
        if (prev.has(edgeId)) continue
        // edge append
        createEdgeState(edgeStates, edges, edgeId, false, false, configs.edge)
      }

      for (const edgeId of prev) {
        if (idSet.has(edgeId)) continue
        // remove edge
        selectedEdges.delete(edgeId)
        hoveredEdges.delete(edgeId)
        delete edgeStates[edgeId]
      }
    }
  )

  const states = { nodeStates, edgeStates, layouts }
  provide(statesKey, states)
  return states
}

export function useStates() {
  return nonNull(inject(statesKey), "states")
}
