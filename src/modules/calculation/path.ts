import { NodePositions, PositionOrCurve } from "@/common/types"
import { NodeStates } from "@/models/node"
import { EdgeStates, EdgeState } from "@/models/edge"
import { EdgeLine, EdgeObject, PathState } from "@/models/path"
import { PathEndType } from "@/common/configs"
import { findFirstNonNull } from "@/utils/collection"
import * as v2d from "@/modules/calculation/2d"
import * as PointUtils from "@/modules/calculation/point"
import { VectorLine } from "@/modules/calculation/line"
import * as LineUtils from "@/modules/calculation/line"
import * as NodeUtils from "@/modules/node/node"
import V, { Vector2D } from "@/modules/vector2d"

const EPSILON = Number.EPSILON * 100 // 2.2204... x 10‍−‍14.

export function calculatePathPoints(
  path: PathState,
  nodeStates: NodeStates,
  nodeLayouts: NodePositions,
  edgeStates: EdgeStates,
  scale: number,
  curveInNode: boolean,
  pathEndType: PathEndType,
  margin: number
): PositionOrCurve[] {
  // The relationship between the source/target of a link and the connection
  // by path can be different.
  // Detect node at connection point and determine source/target for the path.
  const edges = path.edges

  // Edge ID list -> List of Edge locations
  const directions = _detectDirectionsOfPathEdges(edges) // true: forward, false: reverse
  const edgePos = edges.map((edge, i) => _getEdgeLine(edge, directions[i], edgeStates[edge.edgeId]))

  // the results
  const points: (Vector2D[] | Vector2D)[] = []

  let isMarginOverRunStart = false
  let isMarginOverRunEnd = false

  // ----------------------------------------------------
  // Determine the starting point.
  // ----------------------------------------------------
  {
    const firstEdge = edgePos[0]
    let nodeRadius = NodeUtils.getNodeRadius(nodeStates[firstEdge.source].shape) * scale
    const lineMargin = margin + (pathEndType === "edgeOfNode" ? nodeRadius : 0)
    const nextPoint =
      lineMargin <= 0
        ? firstEdge.line.source
        : _calculateEdgeOfNode(firstEdge, lineMargin, nodeLayouts, true)
    points.push(nextPoint)
    nodeRadius = NodeUtils.getNodeRadius(nodeStates[firstEdge.target].shape) * scale
    if (margin > 0) {
      const distance = V.distance(firstEdge.line.source, firstEdge.line.target)
      if (distance <= lineMargin + nodeRadius) {
        isMarginOverRunStart = true
      }
    }
  }

  // ----------------------------------------------------
  // Determine transit points.
  // ----------------------------------------------------
  const length = edges.length
  for (let i = 1; i < length; i++) {
    const prev = edgePos[i - 1]
    const next = edgePos[i]

    const nodeId = next.source
    const nodePos = Vector2D.fromObject(nodeLayouts[nodeId] ?? { x: 0, y: 0 })

    // The intersection point of two lines: [X]
    const crossPoint = _getIntersectionOfLines(prev, next, nodePos)

    // Place another small circle inside the node's circle and
    // calculate transit points so that the path line is smooth.
    //   Inner circle: [α] radius: `nodeCoreRadius`
    //   Node circle : [β]  radius: `nodeRadius`
    const nodeRadius = NodeUtils.getNodeRadius(nodeStates[nodeId].shape) * scale
    const nodeCoreRadius = Math.max(nodeRadius * (2 / 3), nodeRadius - 4 * scale)
    const prevCoreIp = _getIntersectionOfLineAndNode(prev, nodePos, nodeCoreRadius, true)
    const nextCoreIp = _getIntersectionOfLineAndNode(next, nodePos, nodeCoreRadius, false)
    const prevNodeIp = _getIntersectionOfLineAndNode(prev, nodePos, nodeRadius, true)
    const nextNodeIp = _getIntersectionOfLineAndNode(next, nodePos, nodeRadius, false)

    // ----------------------------------------------------
    // Calculate transit points in the node.
    // ----------------------------------------------------
    let pos: Vector2D | Vector2D[]
    if (crossPoint) {
      const d = V.distance(crossPoint, nodePos)
      if (d < nodeCoreRadius) {
        // (1) [α] includes [X]:
        //  * [X]: control point in bezier
        //  * intersection with [α]: transit point
        pos = [
          findFirstNonNull(prevCoreIp, prevNodeIp, prev.line.target),
          crossPoint,
          findFirstNonNull(nextCoreIp, nextNodeIp, next.line.source),
        ]
      } else if (d <= nodeRadius) {
        // (2) [β] includes [X]:
        //  * [X]: control point in bezier
        let p1: Vector2D, p2: Vector2D
        if (prevNodeIp && prevCoreIp) {
          // the prev line intersects [α] and [β]:
          // Of [α]x[line], [β]x[line], use the one closer to [X] as the transit point.
          p1 =
            V.distance(crossPoint, prevCoreIp) < V.distance(crossPoint, prevNodeIp)
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
            V.distance(crossPoint, nextCoreIp) < V.distance(crossPoint, nextNodeIp)
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
            findFirstNonNull(prevCoreIp, prevNodeIp, prev.line.target),
            nodePos,
            findFirstNonNull(nextCoreIp, nextNodeIp, next.line.source),
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

    // ----------------------------------------------------
    // Specify points on the curve.
    // ----------------------------------------------------
    if (prev.curve) {
      // The starting point has already been added to `points`.
      const lastPoints = points[points.length - 1]
      if (lastPoints) {
        const lastPoint =
          lastPoints instanceof Array ? lastPoints[lastPoints.length - 1] : lastPoints
        let nextPoint
        if (pos instanceof Array) {
          // Curved lines always end at the center of the node.
          // To avoid smoothness, use only a transit point.
          nextPoint = curveInNode ? pos[0] : pos[1]
        } else {
          nextPoint = pos
        }
        const control = v2d.calculateBezierCurveControlPoint(
          lastPoint,
          prev.curve.circle.center,
          nextPoint,
          prev.curve.theta
        )
        if (pos instanceof Array && curveInNode) {
          points.push([...control, ...pos])
        } else {
          points.push([...control, nextPoint])
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

  // ----------------------------------------------------
  // Determine the terminate point.
  // ----------------------------------------------------
  {
    const lastEdge = edgePos[edgePos.length - 1]
    let nodeRadius = NodeUtils.getNodeRadius(nodeStates[lastEdge.target].shape) * scale
    const lineMargin = margin + (pathEndType === "edgeOfNode" ? nodeRadius : 0)
    const nextPoint =
      lineMargin <= 0
        ? lastEdge.line.target
        : _calculateEdgeOfNode(lastEdge, lineMargin, nodeLayouts, false)
    nodeRadius = NodeUtils.getNodeRadius(nodeStates[lastEdge.source].shape) * scale
    const curve = lastEdge.curve
    if (curve) {
      // curve
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
      points.push(nextPoint)
    }
    if (margin > 0) {
      const distance = V.distance(lastEdge.line.source, lastEdge.line.target)
      if (distance <= lineMargin + nodeRadius) {
        isMarginOverRunEnd = true
      }
    }
  }

  if (isMarginOverRunStart) {
    points.shift()
    if (points[0] instanceof Array) {
      points.unshift(points[0][0])
    }
  }
  if (isMarginOverRunEnd) {
    points.pop()
  }

  return points
}

function _detectDirectionsOfPathEdges(edges: EdgeObject[]): boolean[] {
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

function _calculateEdgeOfNode(
  edge: EdgeLine,
  nodeRadius: number,
  nodeLayouts: NodePositions,
  direction: boolean
) {
  const nodeId = direction ? edge.source : edge.target
  const curve = edge.curve
  if (curve) {
    let moveRad = nodeRadius / curve.circle.radius
    if (curve.theta > 0) {
      moveRad *= -1
    }
    if (!direction) {
      moveRad *= -1
    }
    return Vector2D.fromObject(
      v2d.moveOnCircumference(
        direction ? edge.line.source : edge.line.target,
        curve.circle.center,
        moveRad
      )
    )
  } else {
    let source: Vector2D, target: Vector2D
    if (direction) {
      source = edge.line.target
      target = edge.line.source
    } else {
      source = edge.line.source
      target = edge.line.target
    }
    // straight
    if (nodeLayouts[nodeId]) {
      const p = PointUtils.getIntersectionOfLineTargetAndCircle(
        source,
        target,
        Vector2D.fromObject(nodeLayouts[nodeId]),
        nodeRadius
      )
      return p === null ? source : p
    } else {
      return source
    }
  }
}

function _getIntersectionOfLines(
  prev: EdgeLine,
  next: EdgeLine,
  nodePos: Vector2D
): Vector2D | null {
  let crossPoint: Vector2D | null = null
  if (prev.curve) {
    if (next.curve) {
      if (prev.line.target.isEqualTo(next.line.source)) {
        return prev.line.target.clone()
      }
      // curve -- curve
      crossPoint = PointUtils.getIntersectionOfCircles(
        prev.curve.circle.center,
        prev.curve.circle.radius,
        next.curve.circle.center,
        next.curve.circle.radius,
        prev.curve.center
      )
    } else {
      // curve -- straight
      crossPoint = PointUtils.getIntersectionOfLineTargetAndCircle2(
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
      crossPoint = PointUtils.getIntersectionOfLineTargetAndCircle(
        prev.line.source,
        prev.line.target,
        next.curve.circle.center,
        next.curve.circle.radius
      )
    } else {
      // straight -- straight
      const prevSlope = _getSlope(prev.line)
      const nextSlope = _getSlope(next.line)
      const isParallel =
        (!isFinite(prevSlope) && !isFinite(nextSlope)) || Math.abs(prevSlope - nextSlope) < EPSILON
      if (isParallel) {
        crossPoint = null // not exist intersection point
      } else {
        crossPoint = PointUtils.getIntersectionPointOfLines(prev.line, next.line)
      }
    }
  }
  return crossPoint
}

function _getIntersectionOfLineAndNode(
  edge: EdgeLine,
  nodeCenter: Vector2D,
  nodeRadius: number,
  targetSide: boolean
): Vector2D | null {
  if (edge.curve) {
    return PointUtils.getIntersectionOfCircles(
      nodeCenter,
      nodeRadius,
      edge.curve.circle.center,
      edge.curve.circle.radius,
      Vector2D.fromObject(edge.curve.center)
    )
  } else {
    return PointUtils.getIntersectionOfLineTargetAndCircle(
      targetSide ? edge.line.source : edge.line.target,
      targetSide ? edge.line.target : edge.line.source,
      nodeCenter,
      nodeRadius
    )
  }
}

function _getEdgeLine(edge: EdgeObject, direction: boolean, state: EdgeState): EdgeLine {
  let position = state.origin
  let source = edge.edge.source
  let target = edge.edge.target
  let curve = state.curve
  if (!direction) {
    position = LineUtils.inverseLine(position)
    source = edge.edge.target
    target = edge.edge.source
    if (curve) {
      curve = { ...curve, theta: -curve.theta }
    }
  }
  const line = VectorLine.fromLinePosition(position)
  const result: EdgeLine = {
    edgeId: edge.edgeId,
    source,
    target,
    line,
    curve,
  }
  return result
}

function _getSlope(pos: VectorLine) {
  return (pos.target.y - pos.source.y) / (pos.target.x - pos.source.x)
}
