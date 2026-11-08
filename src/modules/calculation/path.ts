import { chunk } from "lodash-es"
import { nonNull } from "@/common/common"
import { PathEndType } from "@/common/configs"
import { NodePositions, Position } from "@/common/types"
import { EdgeStates, EdgeState } from "@/models/edge"
import { NodeStates } from "@/models/node"
import { EdgeLine, EdgeObject, PathState } from "@/models/path"
import * as v2d from "@/modules/calculation/2d"
import { VectorLine } from "@/modules/calculation/line"
import * as LineUtils from "@/modules/calculation/line"
import * as PointUtils from "@/modules/calculation/point"
import * as NodeUtils from "@/modules/node/node"
import { positionOf } from "@/modules/node/position"
import V, { Vector2D } from "@/modules/vector2d"
import { findFirstNonNull } from "@/utils/collection"

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
): (Position | Position[] | string)[] {
  // The relationship between the source/target of a link and the connection
  // by path can be different.
  // Detect node at connection point and determine source/target for the path.
  const edges = path.edges

  // Edge ID list -> List of Edge locations
  const directions = path.directions // true: forward, false: reverse
  const edgePos = edges.map((edge, i) => _getEdgeLine(edge, directions[i], edgeStates[edge.edgeId]))

  // the results
  const points: (Vector2D[] | Vector2D)[] = []

  let isMarginOverRunStart = false
  let isMarginOverRunEnd = false

  // ----------------------------------------------------
  // Determine the starting point.
  // ----------------------------------------------------
  // A loop starts with its arc, which takes the margin along the loop.
  if (!edgePos[0].loop) {
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
    const nodePos = Vector2D.fromObject(positionOf(nodeLayouts, nodeId))

    // The intersection point of two lines: [X]
    const crossPoint = _getIntersectionOfLines(prev, next, nodePos)

    // Place another small circle inside the node's circle and
    // calculate transit points so that the path line is smooth.
    //   Inner circle: [α] radius: `nodeCoreRadius`
    //   Node circle : [β] radius: `nodeRadius`
    const nodeRadius = NodeUtils.getNodeRadius(nodeStates[nodeId].shape) * scale
    const nodeCoreRadius = Math.max(nodeRadius * (2 / 3), nodeRadius - 4 * scale)
    const isForwardPrev = _isForward(prev)
    const isForwardNext = _isForward(next)
    const prevCoreIp = _getIntersectionOfLineAndNode(prev, nodePos, nodeCoreRadius, isForwardPrev)
    const nextCoreIp = _getIntersectionOfLineAndNode(next, nodePos, nodeCoreRadius, !isForwardNext)
    const prevNodeIp = _getIntersectionOfLineAndNode(prev, nodePos, nodeRadius, isForwardPrev)
    const nextNodeIp = _getIntersectionOfLineAndNode(next, nodePos, nodeRadius, !isForwardNext)

    // ----------------------------------------------------
    // Calculate transit points in the node.
    // ----------------------------------------------------
    // The transit point into the node, the control point, and the transit point out of it.
    let pos: [Vector2D, Vector2D, Vector2D]
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
          // A line that misses the node passes it farther than [X], which is in it.
          /* v8 ignore next */
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
          // A line that misses the node passes it farther than [X], which is in it.
          /* v8 ignore next */
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

    if (prev.curve) {
      // ----------------------------------------------------
      // Specify points on the curve.
      // ----------------------------------------------------
      // The starting point has already been added to `points`.
      const lastPoints = points[points.length - 1]
      const lastPoint = lastPoints instanceof Array ? lastPoints[lastPoints.length - 1] : lastPoints
      // Curved lines always end at the center of the node.
      // To avoid smoothness, use only a transit point.
      const nextPoint = curveInNode ? pos[0] : pos[1]
      const control = v2d.calculateBezierCurveControlPoint(
        lastPoint,
        prev.curve.circle.center,
        nextPoint,
        prev.curve.theta
      )
      if (curveInNode) {
        points.push([...control, ...pos])
      } else {
        points.push([...control, nextPoint])
      }
    } else if (prev.loop) {
      const [p1, p2, arc] = _makeArcString(nodePos, prev, nodeRadius, i === 1 ? margin : 0)
      points.push(p1)
      if (arc) points.push(arc)
      if (curveInNode) {
        points.push([p2, pos[1], pos[2]])
      } else {
        points.push(pos[2])
      }
    } else {
      if (curveInNode) {
        points.push(pos)
      } else {
        if (next.curve) {
          points.push(pos[1]) // use control point as transit point
        } else if (next.loop) {
          points.push(pos[0])
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
    if (lastEdge.loop) {
      const nodePos = Vector2D.fromObject(positionOf(nodeLayouts, lastEdge.target))
      const isOnlyEdge = edgePos.length === 1
      const [p1, _, arc] = _makeArcString(
        nodePos,
        lastEdge,
        nodeRadius,
        isOnlyEdge ? margin : 0,
        margin
      )
      // A path of a single loop that the margins use up draws nothing.
      if (arc) {
        points.push(p1, arc)
      } else if (!isOnlyEdge) {
        points.push(p1)
      }
    } else if (lastEdge.curve) {
      // curve
      const pos = points[points.length - 1]
      const lastPoint = pos instanceof Array ? pos[pos.length - 1] : pos
      const control = v2d.calculateBezierCurveControlPoint(
        lastPoint,
        lastEdge.curve.circle.center,
        nextPoint,
        lastEdge.curve.theta
      )
      points.push([...control, nextPoint])
    } else {
      // straight
      points.push(nextPoint)
    }
    if (margin > 0 && !lastEdge.loop) {
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

/** The `Q` commands of quadratic curves, from pairs of a control point and an end point. */
export function quadraticCurveCommands(points: Position[]): string[] {
  return chunk(points, 2).map(([c, p]) => `Q ${c.x} ${c.y} ${p.x} ${p.y}`)
}

export function calculateDirectionsOfPathEdges(edges: EdgeObject[]): boolean[] {
  const length = edges.length
  if (length === 0) return []
  if (length <= 1) return [true]

  const directions: boolean[] = [] // true: forward, false: reverse
  let lastNode: string | null = null
  let isForward: boolean
  for (let i = 0; i < length; i++) {
    const source = edges[i].edge.source
    const target = edges[i].edge.target
    if (source === target) {
      isForward = true // loop edge direction is always true
    } else if (i === 0) {
      // Edges between the same nodes leave the joint to the edges after them, and to none if all are.
      const joint = _getJointNode(edges, 0)
      isForward = joint === null || joint === target
    } else {
      isForward = lastNode === source
    }
    directions.push(isForward)
    lastNode = isForward ? target : source
  }

  return directions
}

function _getJointNode(edges: EdgeObject[], index: number): string | null {
  const edgeObject0 = edges[index]
  const edgeObject1 = edges[index + 1]
  const currentEdge = [edgeObject0.edge.source, edgeObject0.edge.target].sort()
  const nextEdge = [edgeObject1.edge.source, edgeObject1.edge.target].sort()

  // The current edge is never a loop: the caller takes a loop first itself, and the recursion goes
  // on only to an edge between the same nodes as the current one. A next loop is found below too.
  if (currentEdge[0] === nextEdge[0] && currentEdge[1] === nextEdge[1]) {
    // both edges are between same nodes
    if (index >= edges.length - 2) {
      // cannot be determined.
      return null
    } else {
      // check with next edge
      const joint = _getJointNode(edges, index + 1)
      if (joint === null) {
        return null
      } else {
        return joint === currentEdge[1] ? currentEdge[0] : currentEdge[1]
      }
    }
  } else {
    return nextEdge.includes(currentEdge[1]) ? currentEdge[1] : currentEdge[0]
  }
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
    const p = PointUtils.getIntersectionOfLineTargetAndCircle(
      source,
      target,
      Vector2D.fromObject(positionOf(nodeLayouts, nodeId)),
      nodeRadius
    )
    // A shifted line can miss the circle. Its end at the node is then nearest to the center.
    return p ?? target
  }
}

function _getIntersectionOfLines(
  prev: EdgeLine,
  next: EdgeLine,
  nodePos: Vector2D
): Vector2D | null {
  let crossPoint: Vector2D | null = null
  if (prev.loop || next.loop) {
    crossPoint = null // not exist intersection point
  } else if (prev.curve) {
    if (next.curve) {
      // curve -- curve: both run between the centers of the nodes, and meet at this one.
      crossPoint = prev.line.target.clone()
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
  if (edge.loop) {
    const points = PointUtils.getIntersectionOfCircles(
      nodeCenter,
      nodeRadius,
      edge.loop.center,
      edge.loop.radius[0]
    )
    return points ? (targetSide ? points[0] : points[1]) : null
  } else if (edge.curve) {
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
  const loop = state.loop
  if (loop) {
    position = state.position
  } else if (!direction) {
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
    direction,
    curve,
    loop,
  }
  return result
}

function _getSlope(pos: VectorLine) {
  return (pos.target.y - pos.source.y) / (pos.target.x - pos.source.x)
}

/**
 * The arc of a loop, shortened along the loop by the margins at its start and end.
 * When the margins use up the loop, there is no arc, and both points are its start if its end has
 * a margin, or else its end.
 */
function _makeArcString(
  nodePos: Vector2D,
  edge: EdgeLine,
  nodeRadius: number,
  startMargin = 0,
  endMargin = 0
): [Vector2D, Vector2D, any] {
  const { radius, center } = nonNull(edge.loop, "Loop of edge parameter")
  const [rx, ry] = radius
  const ends = PointUtils.getIntersectionOfCircles(nodePos, nodeRadius, center, radius[0])
  let [end1, end2] = ends ? ends.reverse() : [edge.line.source, edge.line.target]
  const isClockwise = _isForward(edge)
  // Without intersections, edge.line already puts the ends of the loop in the order of its direction.
  if (ends && !isClockwise) {
    ;[end1, end2] = [end2, end1]
  }
  const a1 = Vector2D.fromObject(end1).subtract(center).angleDegree()
  const a2 = Vector2D.fromObject(end2).subtract(center).angleDegree()
  const angle = (a2 + 360 - a1) % 360
  const sweep = ((isClockwise ? angle : 360 - angle) * Math.PI) / 180
  const startRad = Math.max(startMargin, 0) / rx
  const endRad = Math.max(endMargin, 0) / rx
  if (startRad + endRad > 0 && startRad + endRad >= sweep) {
    const p = endRad > 0 ? end1 : end2
    return [p, p, undefined]
  }

  const direction = isClockwise ? 1 : -1
  const p1 = Vector2D.fromObject(v2d.moveOnCircumference(end1, center, startRad * direction))
  const p2 = Vector2D.fromObject(v2d.moveOnCircumference(end2, center, -endRad * direction))
  const f1 = sweep - startRad - endRad > Math.PI ? 1 : 0
  const f2 = isClockwise ? 1 : 0

  return [p1, p2, `A ${rx} ${ry} 0 ${f1} ${f2} ${p2.x} ${p2.y}`]
}

function _isForward(edge: EdgeLine) {
  if (edge.loop) {
    // A loop is always taken forward.
    return edge.loop.isClockwise
  } else {
    return true
  }
}
