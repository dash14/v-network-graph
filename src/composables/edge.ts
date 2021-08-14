import { computed, ComputedRef, inject, InjectionKey, provide, reactive, watchEffect } from "vue"
import { nonNull } from "../common/common"
import { Config, Configs, EdgeConfig } from "../common/configs"
import { Edge, Edges, Nodes, Position } from "../common/types"

// -----------------------------------------------------------------------
// Private type definition
// -----------------------------------------------------------------------

interface EdgeGroup {
  edges: Edges
  groupWidth: number
  summarize: boolean
}

interface EdgeLayoutPoint {
  edge: Edge
  pointInGroup: number
  groupWidth: number
}

interface LinePosition {
  x1: number
  y1: number
  x2: number
  y2: number
}

interface State {
  edgeLayoutPoints: Record<string, EdgeLayoutPoint>
  edgeGroups: Record<string, EdgeGroup>
  summarizedEdges: Record<string, true>
}

interface EdgePositionsState {
  state: State
  edgePositions: ComputedRef<(edgeId: string, source?: Position, target?: Position) => LinePosition>
}

// -----------------------------------------------------------------------
// Private Constants
// -----------------------------------------------------------------------

const edgePositionStateKey = Symbol("containers") as InjectionKey<EdgePositionsState>

// -----------------------------------------------------------------------
// Exported functions
// -----------------------------------------------------------------------

export function provideEdgePositions(
  nodes: Nodes,
  edges: Edges,
  configs: Configs,
  scale: ComputedRef<number>
) {
  // Calculate position map
  const state = reactive<State>({
    edgeLayoutPoints: {},
    edgeGroups: {},
    summarizedEdges: {},
  })

  watchEffect(() => {
    const { edgeLayoutPoints, edgeGroups } = calculateEdgeGroupAndPositions(
      configs.edge,
      nodes,
      edges
    )
    state.edgeLayoutPoints = edgeLayoutPoints
    state.edgeGroups = edgeGroups
  })

  // calc layout and check summarize
  watchEffect(() => {
    const summarizedEdges: Record<string, true> = {}
    for (const [id, { edges, groupWidth }] of Object.entries(state.edgeGroups)) {
      let summarize = false
      if (groupWidth == 0) {
        summarize = false
      } else if (configs.edge.summarize instanceof Function) {
        summarize = configs.edge.summarize(edges, configs)
      } else if (configs.edge.summarize) {
        summarize = defaultCheckSummarize(nodes, edges, configs, groupWidth)
      } else {
        summarize = false
      }
      state.edgeGroups[id].summarize = summarize
      if (summarize) {
        Object.keys(edges).forEach(id => (summarizedEdges[id] = true))
      }
    }
    state.summarizedEdges = summarizedEdges
  })

  // calc position reactively
  const edgePositions = computed(
    () =>
      (edgeId: string, source?: Position, target?: Position): LinePosition => {
        const p = state.edgeLayoutPoints[edgeId]
        if (!p) {
          return { x1: 0, y1: 0, x2: 0, y2: 0 } // sanitized
        }
        if (edgeId in state.summarizedEdges) {
          // summarize
          return calculateEdgePosition(p.edge, source, target, scale.value, 0, 0)
        } else {
          return calculateEdgePosition(
            p.edge,
            source,
            target,
            scale.value,
            p.groupWidth,
            p.pointInGroup
          )
        }
      }
  )

  const result: EdgePositionsState = { state, edgePositions }
  provide(edgePositionStateKey, result)
  return result
}

export function useEdgePositions() {
  return nonNull(inject(edgePositionStateKey), "edgePositions")
}

// -----------------------------------------------------------------------
// Private functions
// -----------------------------------------------------------------------

function calculateEdgeGroupAndPositions(config: EdgeConfig, nodes: Nodes, edges: Edges) {
  const edgeLayoutPoints: Record<string, EdgeLayoutPoint> = {}
  const edgeGroups: Record<string, EdgeGroup> = {}

  if (!config.summarize) {
    return { edgeLayoutPoints, edgeGroups }
  }

  // make edge groups that between same nodes
  const map: Record<string, Edges> = {}
  for (const [id, edge] of Object.entries(edges)) {
    if (!(edge.source in nodes && edge.target in nodes)) {
      // reject if no node ID is found on the nodes
      continue
    }
    const key = [edge.source, edge.target].sort().join("<=>")
    const values = map[key] || {}
    values[id] = edge
    map[key] = values
  }

  // Calculate the following:
  // - the starting point of each line
  // - the width between the centers of the lines at both ends
  // *Note*: the drawing position of the line is the center of the line.
  const gap = config.gap
  for (const [key, edges] of Object.entries(map)) {
    if (Object.keys(edges).length <= 1) {
      const [edgeId, edge] = Object.entries(edges)[0]
      edgeLayoutPoints[edgeId] = { edge, pointInGroup: 0, groupWidth: 0 }
      edgeGroups[key] = { edges, groupWidth: 0, summarize: false }
    } else {
      let pointInGroup = 0
      const lineHalfWidths = Object.values(edges).map(edge => {
        return Config.value(config.normal.width, edge) / 2
      })
      const points = Object.entries(edges).map(([edgeId, edge], i) => {
        if (i > 0) {
          pointInGroup += lineHalfWidths[i - 1] + gap + lineHalfWidths[i]
        }
        return [edgeId, edge, pointInGroup] as [string, Edge, number]
      })
      const groupWidth = pointInGroup
      points.forEach(([edgeId, edge, pointInGroup]) => {
        edgeLayoutPoints[edgeId] = { edge, pointInGroup, groupWidth }
      })
      edgeGroups[key] = { edges, groupWidth, summarize: false }
    }
  }

  return { edgeLayoutPoints, edgeGroups }
}

function defaultCheckSummarize(nodes: Nodes, edges: Edges, configs: Configs, width: number) {
  // aggregate if the edge width and gap width exceed the size of the node
  const edgeCount = Object.entries(edges).length
  if (edgeCount === 1) return false

  // const width =
  //   Object.values(edges)
  //     .map(e => Config.value(configs.edge.normal.width, e))
  //     .reduce((sum, v) => sum + v, 0) +
  //   configs.edge.gap * (edgeCount - 1)

  const minWidth = Math.min(
    ...Object.values(edges)
      .flatMap(e => [nodes[e.source], nodes[e.target]])
      .filter(v => v)
      .map(node => {
        const shape = Config.values(configs.node.normal, node)
        if (shape.type === "circle") {
          return shape.radius * 2
        } else {
          return Math.min(shape.width, shape.height)
        }
      })
  )
  return width > minWidth
}

function calculateEdgePosition(
  edge: Edge,
  source: Position | undefined,
  target: Position | undefined,
  scale: number,
  groupWidth: number,
  pointInGroup: number
): LinePosition {
  let x1, y1, x2, y2
  if (edge.source < edge.target) {
    [x1, y1, x2, y2] = calculateLinePosition(
      source?.x ?? 0,
      source?.y ?? 0,
      target?.x ?? 0,
      target?.y ?? 0,
      scale,
      groupWidth,
      pointInGroup
    )
  } else {
    [x2, y2, x1, y1] = calculateLinePosition(
      target?.x ?? 0,
      target?.y ?? 0,
      source?.x ?? 0,
      source?.y ?? 0,
      scale,
      groupWidth,
      pointInGroup
    )
  }
  return { x1, y1, x2, y2 }
}

function calculateLinePosition(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  scale: number,
  groupWidth: number,
  pointInGroup: number
): [number, number, number, number] {
  const dx = x2 - x1
  const dy = y2 - y1

  // Shifting width from center
  let diff = (pointInGroup - groupWidth / 2) * scale

  if (dx === 0) {
    return [x1 + diff, y1, x2 + diff, y2]
  } else if (dy === 0) {
    return [x1, y1 + diff, x2, y2 + diff]
  } else {
    const slope = dy / dx
    const moveSlope = -1 / slope
    if (dy < 0) {
      diff = -diff
    }
    const diffX = diff / Math.sqrt(1 + Math.pow(moveSlope, 2))
    return [x1 + diffX, y1 + diffX * moveSlope, x2 + diffX, y2 + diffX * moveSlope]
  }
}
