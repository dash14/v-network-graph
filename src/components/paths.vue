<template>
  <g class="v-paths">
    <v-path-line
      v-for="(path, i) in pathList"
      :key="i"
      :points="calcPathPoints(path)"
      :class="{ clickable: pathConfig.clickable }"
      :path="path.path"
      @click.prevent.stop="emitPathClicked(path.path)"
    />
  </g>
</template>

<script lang="ts">
import { computed, defineComponent, PropType } from "vue"
import { Edge, Edges, LinePosition, NodePositions, Position } from "../common/types"
import { Path, Paths, PositionOrCurve } from "../common/types"
import { NodeStates, useStates } from "../composables/state"
import { usePathConfig } from "../composables/style"
import { EdgeGroupState, EdgePositionGetter, useEdgePositions } from "../composables/edge"
import { useZoomLevel } from "../composables/zoom"
import { useEventEmitter } from "../composables/event-emitter"
import { AnyShapeStyle } from "../common/configs"
import * as v2d from "../common/2d"
import VPathLine from "./path-line.vue"
import isEqual from "lodash-es/isEqual"

interface EdgeObject {
  edgeId: string
  edge: Edge
}

interface PathObject {
  path: Path
  edges: EdgeObject[]
}

const EPSILON = Number.EPSILON * 100 // 2.2204... x 10‍−‍14.

function getNodeRadius(shape: AnyShapeStyle) {
  if (shape.type == "circle") {
    return shape.radius
  } else {
    return Math.min(shape.width, shape.height) / 2
  }
}

function calculatePathPoints(
  path: PathObject,
  nodeStates: NodeStates,
  nodeLayouts: NodePositions,
  state: EdgeGroupState,
  edgePositions: EdgePositionGetter,
  scale: number,
  curveInNode: boolean
): PositionOrCurve[] {
  // Edge ID list -> List of Edge locations
  const edgePos = path.edges.map(({ edgeId, edge }) =>
    edgePositions(edgeId, nodeLayouts[edge.source], nodeLayouts[edge.target])
  )

  // The relationship between the source/target of a link and the connection
  // by path can be different.
  // Detect node at connection point and determine source/target for the path.
  const edges = path.edges
  const length = edges.length
  const directions: boolean[] = [] // true: forward, false: reverse
  if (length > 1) {
    let lastNode: string | null = null
    for (let i = 0; i < length; i++) {
      const source = edges[i].edge.source
      const target = edges[i].edge.target
      let isForward
      if (i === 0) {
        const nextSlope = [edges[1].edge.source, edges[1].edge.target]
        isForward = nextSlope.includes(target)
      } else {
        isForward = lastNode === source
      }
      directions.push(isForward)
      lastNode = isForward ? target : source
    }
  } else {
    directions.push(true)
  }

  // Generate the `d` attribute of the actual path from the Edge position list.
  let prev = getEdgePositions(edges[0].edgeId, edgePos[0], directions[0])
  let prevSlope = getSlope(prev)
  const points: PositionOrCurve[] = [prev.source]
  for (let i = 1; i < length; i++) {
    const next = getEdgePositions(edges[i].edgeId, edgePos[i], directions[i])
    const nextSlope = getSlope(next)

    const node = directions[i] ? edges[i].edge.source : edges[i].edge.target
    const prevNode = directions[i - 1] ? edges[i - 1].edge.target : edges[i - 1].edge.source

    if (node !== prevNode) {
      // diconnected edges
      points.push(prev.target)
      points.push(null)
      points.push(next.source)
      prev = next
      prevSlope = nextSlope
      continue
    }

    const nodePos = nodeLayouts[node] ?? { x: 0, y: 0 }
    const radius = getNodeRadius(nodeStates[node].shape)

    if (
      (state.edgeLayoutPoints[prev.edgeId]?.groupWidth ?? 0) == 0 &&
      (state.edgeLayoutPoints[next.edgeId]?.groupWidth ?? 0) == 0
    ) {
      // If there is one edge in both sections:
      if (curveInNode) {
        // Make the curve with the center of the node as the control point.
        const r = radius * scale
        // Intersection of a line and the circumference of a circle
        const cp1 = v2d.getIntersectionOfLineAndCircle(prev, true, nodePos, r) ?? prev.target
        const cp2 = v2d.getIntersectionOfLineAndCircle(next, false, nodePos, r) ?? next.source
        points.push(cp1)
        points.push([nodePos, nodePos, cp2])
      } else {
        // Connect them at the center of the node.
        points.push(prev.target)
        if (!isEqual(prev.target, next.source)) {
          points.push(next.source)
        }
      }
    } else if (
      (!isFinite(prevSlope) && !isFinite(nextSlope)) ||
      Math.abs(prevSlope - nextSlope) < EPSILON
    ) {
      // For parallel lines, connect the end points of the lines.
      const r = Math.max(radius * (2 / 3), radius - 4) * scale
      const cp1 = v2d.getIntersectionOfLineAndCircle(prev, true, nodePos, r) ?? prev.target
      const cp2 = v2d.getIntersectionOfLineAndCircle(next, false, nodePos, r) ?? next.source
      if (curveInNode) {
        points.push(cp1)
        points.push([prev.target, next.source, cp2])
      } else {
        points.push(cp1)
        points.push(cp2)
      }
    } else {
      if (curveInNode) {
        const r = radius * scale
        // Intersection of a line and the circumference of a circle
        const cp1 = v2d.getIntersectionOfLineAndCircle(prev, true, nodePos, r) ?? prev.target
        const cp2 = v2d.getIntersectionOfLineAndCircle(next, false, nodePos, r) ?? next.source

        // Is the intersection of the two lines contained in the circle?
        let cp = v2d.getIntersectionPointOfLines(prev, next)
        if (!v2d.isPointContainedInCircle(cp, nodePos, radius)) {
          // not contained:
          // The intersection of the line from the intersection point to
          // the center of the circle, and the circumference of the circle
          // (with a radius of 2/3) is the control point of the curve.
          const line = { source: cp, target: nodePos }
          cp = v2d.getIntersectionOfLineAndCircle(line, true, nodePos, r * (2 / 3)) ?? nodePos
        }
        points.push(cp1)
        points.push([cp, cp, cp2])
      } else {
        // Create a path with a point on the circumference
        // (but with a radius of 1/3 for better appearance).
        const r = Math.max(radius * (2 / 3), radius - 4) * scale

        // Is the intersection of the two lines contained in the circle?
        let cp = v2d.getIntersectionPointOfLines(prev, next)
        if (v2d.isPointContainedInCircle(cp, nodePos, r)) {
          points.push(cp)
        } else {
          const cp1 = v2d.getIntersectionOfLineAndCircle(prev, true, nodePos, r) ?? prev.target
          const cp2 = v2d.getIntersectionOfLineAndCircle(next, false, nodePos, r) ?? next.source
          points.push(cp1)
          points.push(cp2)
        }
      }
    }

    prev = next
    prevSlope = nextSlope
  }
  points.push(prev.target)

  return points
}

export default defineComponent({
  components: { VPathLine },
  props: {
    paths: {
      type: Array as PropType<Paths>,
      required: true,
    },
    edges: {
      type: Object as PropType<Edges>,
      required: true,
    },
  },
  setup(props) {
    const { state, edgePositions } = useEdgePositions()
    const pathConfig = usePathConfig()
    const { nodeStates, layouts } = useStates()
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
        state,
        edgePositions.value,
        scale.value,
        pathConfig.curveInNode
      )
    })

    const emitPathClicked = (path: Path) => {
      if (!pathConfig.clickable) return
      emitter.emit("path:click", path)
    }

    return { pathConfig, pathList, calcPathPoints, emitPathClicked }
  },
})

interface EdgePosition {
  edgeId: string
  source: Position
  target: Position
}

function getEdgePositions(
  edgeId: string,
  positions: LinePosition,
  direction: boolean
): EdgePosition {
  if (direction) {
    // forward
    return {
      edgeId,
      source: { x: positions.x1, y: positions.y1 },
      target: { x: positions.x2, y: positions.y2 },
    }
  } else {
    // reverse
    return {
      edgeId,
      source: { x: positions.x2, y: positions.y2 },
      target: { x: positions.x1, y: positions.y1 },
    }
  }
}

function getSlope(pos: EdgePosition) {
  return (pos.target.y - pos.source.y) / (pos.target.x - pos.source.x)
}
</script>

<style lang="scss" scoped>
.v-path-line {
  pointer-events: none;
  &.clickable {
    pointer-events: all;
    cursor: pointer;
  }
}
</style>
