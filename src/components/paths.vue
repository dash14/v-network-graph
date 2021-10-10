<script setup lang="ts">
import { computed, PropType } from "vue"
import { Edge, Edges, LinePosition, NodePositions, Position } from "../common/types"
import { Path, Paths, PositionOrCurve } from "../common/types"
import { EdgeStates, NodeStates, useStates, EdgeGroupStates } from "../composables/state"
import { usePathConfig } from "../composables/config"
import { useZoomLevel } from "../composables/zoom"
import { useEventEmitter } from "../composables/event-emitter"
import { AnyShapeStyle, PathEndType } from "../common/configs"
import * as v2d from "../common/2d"
import * as V from "../common/vector"
import VPathLine from "./path-line.vue"

interface EdgeObject {
  edgeId: string
  edge: Edge
}

interface PathObject {
  path: Path
  edges: EdgeObject[]
}

interface EdgeLine {
  edgeId: string
  source: string
  target: string
  line: V.Line
}

const EPSILON = Number.EPSILON * 100 // 2.2204... x 10‍−‍14.

const props = defineProps({
  paths: {
    type: Array as PropType<Paths>,
    required: true,
  },
  edges: {
    type: Object as PropType<Edges>,
    required: true,
  },
})

const pathConfig = usePathConfig()
const { nodeStates, edgeStates, edgeGroupStates, layouts } = useStates()
const { scale } = useZoomLevel()
const { emitter } = useEventEmitter()

const pathList = computed(() => {
  const list: PathObject[] = []
  for (const path of props.paths) {
    const edges = path.edges
      .map(edgeId => ({ edgeId, edge: props.edges[edgeId] }))
      .filter(e => e.edge)
    if (edges.length !== path.edges.length) {
      continue // reject a path includes unknown edge ID
    }
    list.push({ path, edges })
  }
  return list
})

const calcPathPoints = computed(() => (path: PathObject): PositionOrCurve[] => {
  if (path.edges.length === 0) return []
  return calculatePathPoints(
    path,
    nodeStates,
    layouts.nodes,
    edgeStates,
    edgeGroupStates,
    scale.value,
    pathConfig.curveInNode,
    pathConfig.end
  )
})

const emitPathClicked = (path: Path) => {
  if (!pathConfig.clickable) return
  emitter.emit("path:click", path)
}

function getNodeRadius(shape: AnyShapeStyle) {
  if (shape.type == "circle") {
    return shape.radius
  } else {
    return Math.min(shape.width, shape.height) / 2
  }
}

function detectDirectionsOfPathEdges(edges: EdgeObject[]): boolean[] {
  const length = edges.length

  if (length <= 1) {
    return [true]
  }

  const directions: boolean[] = [] // true: forward, false: reverse
  let lastNode: string | null = null
  for (let i = 0; i < length; i++) {
    const source = edges[i].edge.source
    const target = edges[i].edge.target
    let isForward
    if (i === 0) {
      if (length > 2) {
        // If the next edge is an edge between the same nodes,
        // check for more next edges.
        const edge0 = [source, target].sort()
        const edge1 = [edges[1].edge.source, edges[1].edge.target].sort()
        if (edge0[0] === edge1[0] && edge0[1] === edge1[1]) {
          const next = [edges[2].edge.source, edges[2].edge.target]
          if (next.includes(edges[1].edge.target)) {
            // edge1 is forward
            isForward = target === edges[1].edge.source
          } else {
            // edge1 is reverse
            isForward = target === edges[1].edge.target
          }
        } else {
          isForward = [edges[1].edge.source, edges[1].edge.target].includes(target)
        }
      } else {
        isForward = [edges[1].edge.source, edges[1].edge.target].includes(target)
      }
    } else {
      isForward = lastNode === source
    }
    directions.push(isForward)
    lastNode = isForward ? target : source
  }
  return directions
}

function calculatePathPoints(
  path: PathObject,
  nodeStates: NodeStates,
  nodeLayouts: NodePositions,
  edgeStates: EdgeStates,
  edgeGroupStates: EdgeGroupStates,
  scale: number,
  curveInNode: boolean,
  pathEndType: PathEndType
): PositionOrCurve[] {
  // The relationship between the source/target of a link and the connection
  // by path can be different.
  // Detect node at connection point and determine source/target for the path.
  const edges = path.edges
  const length = edges.length

  // Edge ID list -> List of Edge locations
  const directions = detectDirectionsOfPathEdges(edges) // true: forward, false: reverse
  const edgePos = edges.map((edge, i) =>
    getEdgeLine(edge, directions[i], edgeStates[edge.edgeId].origin)
  )

  // 始点を決定する
  const points: PositionOrCurve[] = []
  if (pathEndType === "edgeOfNode") {
    if (edgeStates[edgePos[0].edgeId].curve) {
      // TODO: カーブ
    } else {
      // straight
      const nodeId = edgePos[0].source
      const nodeRadius = getNodeRadius(nodeStates[nodeId].shape) * scale
      // TODO: パス終端を丸くした場合に幅の半分が長くなることの調整
      const p = V.getIntersectionOfLineTargetAndCircle(
        edgePos[0].line.target,
        edgePos[0].line.source,
        V.Vector.fromObject(nodeLayouts[nodeId]),
        nodeRadius
      )
      if (p === null) {
        points.push(edgePos[0].line.source.toObject())
      } else {
        points.push(p.toObject())
      }
    }
  } else {
    points.push(edgePos[0].line.source.toObject())
  }

  // 経由点を決定する
  for (let i = 1; i < length; i++) {
    // 交点X
    const prev = edgePos[i - 1]
    const next = edgePos[i]
    const prevSlope = getSlope(prev.line)
    const nextSlope = getSlope(next.line)
    const isParallel = (!isFinite(prevSlope) && !isFinite(nextSlope)) || Math.abs(prevSlope - nextSlope) < EPSILON

    const crossPoint = V.getIntersectionPointOfLines(prev.line, next.line)

    // 線がαと交わるかどうか
    const nodeId = next.source
    const nodeRadius = getNodeRadius(nodeStates[nodeId].shape) * scale
    const nodePos = V.Vector.fromObject(nodeLayouts[nodeId] ?? { x: 0, y: 0 })
    const nodeCoreRadius = Math.max(nodeRadius * (2 / 3), nodeRadius - 4)
    const prevCoreCp = V.getIntersectionOfLineTargetAndCircle(
      prev.line.source,
      prev.line.target,
      nodePos,
      nodeCoreRadius
    )
    const nextCoreCp = V.getIntersectionOfLineTargetAndCircle(
      next.line.target,
      next.line.source,
      nodePos,
      nodeCoreRadius
    )

    // 線がβと交わるかどうか
    const prevNodeCp = V.getIntersectionOfLineTargetAndCircle(
      prev.line.source,
      prev.line.target,
      nodePos,
      nodeRadius
    )
    const nextNodeCp = V.getIntersectionOfLineTargetAndCircle(
      next.line.target,
      next.line.source,
      nodePos,
      nodeRadius
    )

    let pos: Position | Position[]
    if (!isParallel) {
      const d = V.calculateDistance(crossPoint, nodePos)
      if (d < nodeCoreRadius) {
        // 交点Xがαの中: Xを制御点に、αと線の交点を経由点にする
        // 基本的に2線はαを通るためαとの交点がが選ばれる
        pos = [
          [prevCoreCp, prevNodeCp, prev.line.target].find(p => !!p) as V.Vector,
          crossPoint,
          [nextCoreCp, nextNodeCp, next.line.source].find(p => !!p) as V.Vector
        ]
      } else if (d <= nodeRadius) {
        // ② 交点Xがαの外でβの中: Xを制御点にする
        let p1: V.Vector, p2: V.Vector
        if (prevNodeCp && prevCoreCp) {
          // 線がα・βと交わる場合: α・βと線の交点のうちXと近い方を経由点にする
          p1 = V.calculateDistance(crossPoint, prevCoreCp) < V.calculateDistance(crossPoint, prevNodeCp) ? prevCoreCp : prevNodeCp
        } else {
          // 線がβとのみ交わる場合: βと線の交点を経由点にする
          p1 = prevNodeCp || prev.line.target
        }
        if (nextNodeCp && nextCoreCp) {
          // 線がα・βと交わる場合: α・βと線の交点のうちXと近い方を経由点にする
          p2 = V.calculateDistance(crossPoint, nextCoreCp) < V.calculateDistance(crossPoint, nextNodeCp) ? nextCoreCp : nextNodeCp
        } else {
          // 線がβとのみ交わる場合: βと線の交点を経由点にする
          p2 = nextNodeCp || next.line.source
        }
        pos = [p1, crossPoint, p2].map(p => p.toObject())
      } else {
        // ③ 交点Xがノードの外
        if (prevCoreCp && nextCoreCp) {
          // 2線ともαと交わる場合: αと線の交点を経由点にしノードの中心を制御点にする
          pos = [prevCoreCp, nodePos, nextCoreCp].map(p => p.toObject())
        } else if (prevNodeCp && nextNodeCp) {
          // 2線ともβと交わる場合: βと線の交点を経由点にしノードの中心を制御点にする
          pos = [prevNodeCp, nodePos, nextNodeCp].map(p => p.toObject())
        } else {
          // どちらかがノードに交わらない場合: 交点Xを経由点とし制御点を置かない
          pos = crossPoint.toObject()
        }
      }
    } else {
      // 交点Xが存在しない: ノードの中心を制御点にする
      if (prevCoreCp && nextCoreCp) {
        // 2線ともαと交わる場合: αと線の交点を経由点にする
        pos = [prevCoreCp, nodePos, nextCoreCp].map(p => p.toObject())
      } else if (prevNodeCp && nextNodeCp) {
        // 2線ともβと交わる場合: βと線の交点を経由点にする
        pos = [prevNodeCp, nodePos, nextNodeCp].map(p => p.toObject())
      } else {
        // 線がノードと交わらない場合: 線の端を経由点にする
        pos = [prev.line.target, nodePos, next.line.source].map(p => p.toObject())
      }
    }
    if (curveInNode || !(pos instanceof Array)) {
      points.push(pos)
    } else {
      points.push(pos[0], pos[2])  // without control point
    }
  }

  // 終点を決定する
  const lastEdge = edgePos[edgePos.length - 1]
  if (pathEndType === "edgeOfNode") {
    if (edgeStates[lastEdge.edgeId].curve) {
      // TODO: カーブ
    } else {
      // straight
      const nodeId = lastEdge.target
      const nodeRadius = getNodeRadius(nodeStates[nodeId].shape) * scale
      // TODO: パス終端を丸くした場合に幅の半分が長くなることの調整
      const p = V.getIntersectionOfLineTargetAndCircle(
        lastEdge.line.source,
        lastEdge.line.target,
        V.Vector.fromObject(nodeLayouts[nodeId]),
        nodeRadius
      )
      if (p === null) {
        points.push(lastEdge.line.target.toObject())
      } else {
        points.push(p.toObject())
      }
    }
  } else {
    points.push(lastEdge.line.target.toObject())
  }

  return points
}

function getEdgeLine(
  edge: EdgeObject,
  direction: boolean,
  position: LinePosition
): EdgeLine {
  if (!direction) {
    position = v2d.inverseLine(position)
  }
  const line = V.fromLinePosition(position)
  return {
    edgeId: edge.edgeId,
    source: edge.edge.source,
    target: edge.edge.target,
    line
  }
}

function getSlope(pos: V.Line) {
  return (pos.target.y - pos.source.y) / (pos.target.x - pos.source.x)
}

defineExpose({ pathConfig, pathList, calcPathPoints, emitPathClicked })
</script>

<template>
  <transition-group
    :name="pathConfig.transition"
    :css="!!pathConfig.transition"
    tag="g"
    class="v-paths"
  >
    <v-path-line
      v-for="(path, i) in pathList"
      :key="i"
      :points="calcPathPoints(path)"
      :class="{ clickable: pathConfig.clickable }"
      :path="path.path"
      @click.prevent.stop="emitPathClicked(path.path)"
    />
  </transition-group>
</template>

<style lang="scss" scoped>
.v-path-line {
  pointer-events: none;
  &.clickable {
    pointer-events: all;
    cursor: pointer;
  }
}
</style>
