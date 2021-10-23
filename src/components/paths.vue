<script setup lang="ts">
import { computed, PropType } from "vue"
import { Edge, Edges, NodePositions } from "../common/types"
import { Path, Paths, PositionOrCurve } from "../common/types"
import {
  EdgeStates,
  NodeStates,
  useStates,
  EdgeGroupStates,
  EdgeState,
  Curve,
} from "../composables/state"
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
  curve?: Curve
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
  const edgePos = edges.map((edge, i) => getEdgeLine(edge, directions[i], edgeStates[edge.edgeId]))

  // Determine the starting point.
  const points: (V.Vector[] | V.Vector)[] = []
  let nodeId = edgePos[0].source
  let nodeRadius = getNodeRadius(nodeStates[nodeId].shape) * scale
  if (pathEndType === "edgeOfNode") {
    const curve = edgeStates[edgePos[0].edgeId].curve
    if (curve) {
      let moveRad = nodeRadius / curve.circle.radius
      if (curve.theta > 0) {
        moveRad *= -1
      }
      points.push(
        V.Vector.fromObject(
          v2d.moveOnCircumference(edgePos[0].line.source, curve.circle.center, moveRad)
        )
      )
    } else {
      // straight
      const p = V.getIntersectionOfLineTargetAndCircle(
        edgePos[0].line.target,
        edgePos[0].line.source,
        V.Vector.fromObject(nodeLayouts[nodeId]),
        nodeRadius
      )
      if (p === null) {
        points.push(edgePos[0].line.source)
      } else {
        points.push(p)
      }
    }
  } else {
    points.push(edgePos[0].line.source)
  }

  // Determine transit points.
  for (let i = 1; i < length; i++) {
    const prev = edgePos[i - 1]
    const next = edgePos[i]

    const nodeId = next.source
    const nodeRadius = getNodeRadius(nodeStates[nodeId].shape) * scale
    const nodePos = V.Vector.fromObject(nodeLayouts[nodeId] ?? { x: 0, y: 0 })
    const nodeCoreRadius = Math.max(nodeRadius * (2 / 3), nodeRadius - 4)

    // Calculate the intersection point of two lines: [X]
    const crossPoint = getIntersectionOfLines(prev, next, nodePos)

    // Place another small circle inside the node's circle and
    // calculate transit points so that the path line is smooth.
    //   Inner circle: [α] radius: `nodeCoreRadius`
    //   Node circle : [β]  radius: `nodeRadius`
    const prevCoreIp = getIntersectionOfLineAndNode(prev, nodePos, nodeCoreRadius, true)
    const nextCoreIp = getIntersectionOfLineAndNode(next, nodePos, nodeCoreRadius, false)
    const prevNodeIp = getIntersectionOfLineAndNode(prev, nodePos, nodeRadius, true)
    const nextNodeIp = getIntersectionOfLineAndNode(next, nodePos, nodeRadius, false)

    // Calculate transit points in the node
    let pos: V.Vector | V.Vector[]
    if (crossPoint) {
      const d = V.calculateDistance(crossPoint, nodePos)
      if (d < nodeCoreRadius) {
        // (1) [α] includes [X]:
        //  * [X]: control point in bezier
        //  * intersection with [α]: transit point
        pos = [
          [prevCoreIp, prevNodeIp, prev.line.target].find(p => !!p) as V.Vector,
          crossPoint,
          [nextCoreIp, nextNodeIp, next.line.source].find(p => !!p) as V.Vector,
        ]
      } else if (d <= nodeRadius) {
        // (2) [β] includes [X]:
        //  * [X]: control point in bezier
        let p1: V.Vector, p2: V.Vector
        if (prevNodeIp && prevCoreIp) {
          // the prev line intersects [α] and [β]:
          // Of [α]x[line], [β]x[line], use the one closer to [X] as the transit point.
          p1 =
            V.calculateDistance(crossPoint, prevCoreIp) <
            V.calculateDistance(crossPoint, prevNodeIp)
              ? prevCoreIp
              : prevNodeIp
        } else {
          // the prev line intersects only with [β]:
          // use [β]x[line] as the transit point.
          p1 = prevNodeIp || prev.line.target
        }
        if (nextNodeIp && nextCoreIp) {
          // the next line intersects with [α] and [β]:
          // Of [α]x[line], [β]x[line], use the one closer to [X] as the transit point.
          p2 =
            V.calculateDistance(crossPoint, nextCoreIp) <
            V.calculateDistance(crossPoint, nextNodeIp)
              ? nextCoreIp
              : nextNodeIp
        } else {
          // the next line intersects only with [β]:
          // use [β]x[line] as the transit point.
          p2 = nextNodeIp || next.line.source
        }
        pos = [p1, crossPoint, p2]
      } else {
        // (3) [X] is out of the node([β])
        if (prevCoreIp && nextCoreIp) {
          // both lines intersect with [α]:
          // use the [α]x[line] as transit point, and
          // center of the node as control point in bezier.
          pos = [prevCoreIp, nodePos, nextCoreIp]
        } else if (prevNodeIp && nextNodeIp) {
          // both lines intersect with [β]:
          // use the [β]x[line] as transit point, and
          // center of the node as control point in bezier.
          pos = [prevNodeIp, nodePos, nextNodeIp]
        } else {
          // either or both lines do not intersect the node:
          // [X] as transit point in bezier, and not place control points.
          // [α]x[line] or [β]x[line] or end of [line] as the transit points, and
          // center of the node as control point in bezier.
          pos = [
            [prevCoreIp, prevNodeIp, prev.line.target].find(p => !!p) as V.Vector,
            nodePos,
            [nextCoreIp, nextNodeIp, next.line.source].find(p => !!p) as V.Vector,
          ]
        }
      }
    } else {
      // There is no intersection of two lines:
      // center of the node as control point in bezier.
      if (prevCoreIp && nextCoreIp) {
        // both lines intersect with [α]:
        // [α]x[line] as transit point.
        pos = [prevCoreIp, nodePos, nextCoreIp]
      } else if (prevNodeIp && nextNodeIp) {
        // both lines intersect with [β]:
        // [β]x[line] as transit point.
        pos = [prevNodeIp, nodePos, nextNodeIp]
      } else {
        // either or both lines do not intersect the node:
        // the end of the line as transit point.
        pos = [prev.line.target, nodePos, next.line.source]
      }
    }

    // If the prev line is a curve, specify points on the curve.
    if (prev.curve) {
      // The starting point has already been added to `points`.
      const lastPoints = points[points.length - 1]
      if (lastPoints) {
        const last = lastPoints instanceof Array ? lastPoints[lastPoints.length - 1] : lastPoints

        if (pos instanceof Array) {
          if (curveInNode) {
            const nextPoint = pos[0]
            const control = v2d.calculateBezierCurveControlPoint(
              last,
              prev.curve.circle.center,
              nextPoint,
              prev.curve.theta
            )
            points.push([...control, ...pos])
          } else {
            // Curved lines always end at the center of the node.
            // To avoid smoothness, use only a transit point.
            const nextPoint = pos[1]
            const control = v2d.calculateBezierCurveControlPoint(
              last,
              prev.curve.circle.center,
              nextPoint,
              prev.curve.theta
            )
            points.push([...control, nextPoint])
          }
        } else {
          const control = v2d.calculateBezierCurveControlPoint(
            last,
            prev.curve.circle.center,
            pos,
            prev.curve.theta
          )
          points.push([...control, pos])
        }
      }
    } else {
      if (curveInNode || !(pos instanceof Array)) {
        points.push(pos)
      } else {
        if (next.curve) {
          points.push(pos[1]) // use control point as transit point
        } else {
          points.push(pos[0], pos[2]) // without control point to avoid smoothness
        }
      }
    }
  }

  // Determine the terminate point
  const lastEdge = edgePos[edgePos.length - 1]
  nodeId = lastEdge.target
  nodeRadius = getNodeRadius(nodeStates[nodeId].shape) * scale
  const curve = edgeStates[lastEdge.edgeId].curve
  if (curve) {
    let nextPoint = lastEdge.line.target
    if (pathEndType === "edgeOfNode") {
      let moveRad = nodeRadius / curve.circle.radius
      if (curve.theta > 0) {
        moveRad *= -1
      }
      nextPoint = V.Vector.fromObject(
        v2d.moveOnCircumference(lastEdge.line.target, curve.circle.center, -moveRad)
      )
    }
    const pos = points[points.length - 1]
    const lastPoint = pos instanceof Array ? pos[pos.length - 1] : pos
    const control = v2d.calculateBezierCurveControlPoint(
      lastPoint,
      curve.circle.center,
      nextPoint,
      curve.theta
    )
    points.push([...control, nextPoint])
  } else {
    // straight
    if (pathEndType === "edgeOfNode") {
      const p = V.getIntersectionOfLineTargetAndCircle(
        lastEdge.line.source,
        lastEdge.line.target,
        V.Vector.fromObject(nodeLayouts[nodeId]),
        nodeRadius
      )
      if (p === null) {
        points.push(lastEdge.line.target)
      } else {
        points.push(p)
      }
    } else {
      points.push(lastEdge.line.target)
    }
  }

  return points
}

function getIntersectionOfLines(
  prev: EdgeLine,
  next: EdgeLine,
  nodePos: V.Vector
): V.Vector | null {
  let crossPoint: V.Vector | null = null
  if (prev.curve) {
    if (next.curve) {
      if (prev.line.target.isEqualTo(next.line.source)) {
        return prev.line.target.clone()
      }
      // curve -- curve
      crossPoint = V.getIntersectionOfCircles(
        prev.curve.circle.center,
        prev.curve.circle.radius,
        next.curve.circle.center,
        next.curve.circle.radius,
        prev.curve.center
      )
    } else {
      // curve -- straight
      crossPoint = V.getIntersectionOfLineTargetAndCircle2(
        next.line.target,
        next.line.source,
        prev.curve.circle.center,
        prev.curve.circle.radius,
        nodePos
      )
    }
  } else {
    if (next.curve) {
      // straight -- curve
      crossPoint = V.getIntersectionOfLineTargetAndCircle(
        prev.line.source,
        prev.line.target,
        next.curve.circle.center,
        next.curve.circle.radius
      )
    } else {
      // straight -- straight
      const prevSlope = getSlope(prev.line)
      const nextSlope = getSlope(next.line)
      const isParallel =
        (!isFinite(prevSlope) && !isFinite(nextSlope)) || Math.abs(prevSlope - nextSlope) < EPSILON
      if (isParallel) {
        crossPoint = null // not exist intersection point
      } else {
        crossPoint = V.getIntersectionPointOfLines(prev.line, next.line)
      }
    }
  }
  return crossPoint
}

function getIntersectionOfLineAndNode(
  edge: EdgeLine,
  nodeCenter: V.Vector,
  nodeRadius: number,
  targetSide: boolean
): V.Vector | null {
  if (edge.curve) {
    return V.getIntersectionOfCircles(
      nodeCenter,
      nodeRadius,
      edge.curve.circle.center,
      edge.curve.circle.radius,
      V.Vector.fromObject(edge.curve.center)
    )
  } else {
    return V.getIntersectionOfLineTargetAndCircle(
      targetSide ? edge.line.source : edge.line.target,
      targetSide ? edge.line.target : edge.line.source,
      nodeCenter,
      nodeRadius
    )
  }
}

function getEdgeLine(edge: EdgeObject, direction: boolean, state: EdgeState): EdgeLine {
  let position = state.position
  let source = edge.edge.source
  let target = edge.edge.target
  let curve = state.curve
  if (!direction) {
    position = v2d.inverseLine(position)
    source = edge.edge.target
    target = edge.edge.source
    if (curve) {
      curve = { ...curve, theta: -curve.theta }
    }
  }
  const line = V.fromLinePosition(position)
  const result: EdgeLine = {
    edgeId: edge.edgeId,
    source,
    target,
    line,
    curve,
  }
  return result
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
