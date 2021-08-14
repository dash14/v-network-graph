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
import { Edge, Edges, LinePosition, NodePositions, Nodes, Position } from "../common/types"
import { Path, Paths, PositionOrCurve } from "../common/types"
import { useNodeConfig, usePathConfig } from "../composables/style"
import { EdgeGroupState, EdgePositionGetter, useEdgePositions } from "../composables/edge"
import { useZoomLevel } from "../composables/zoom"
import { useEventEmitter } from "../composables/event-emitter"
import { Config, NodeConfig } from "../common/configs"
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

function getNodeRadius(node: string, nodes: Nodes, nodeConfig: NodeConfig) {
  const nodeObject = nodes[node]
  const shapeType = Config.value(nodeConfig.normal.type, nodes[node])
  let radius: number
  if (shapeType == "circle") {
    radius = Config.value(nodeConfig.normal.radius, nodeObject)
  } else {
    radius = Math.min(
      Config.value(nodeConfig.normal.width, nodeObject),
      Config.value(nodeConfig.normal.height, nodeObject)
    )
  }
  return radius
}

function calculatePathPoints(
  path: PathObject,
  nodes: Nodes,
  nodeLayouts: NodePositions,
  nodeConfig: NodeConfig,
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
  let prevEdge = getEdgePositions(edges[0].edgeId, edgePos[0], directions[0])
  let prevSlope = getSlope(prevEdge)
  const points: PositionOrCurve[] = [prevEdge.source]
  for (let i = 1; i < length; i++) {
    const nextEdge = getEdgePositions(edges[i].edgeId, edgePos[i], directions[i])
    const nextSlope = getSlope(nextEdge)

    const node = directions[i] ? edges[i].edge.source : edges[i].edge.target
    const prevNode = directions[i - 1] ? edges[i - 1].edge.target : edges[i - 1].edge.source

    if (node !== prevNode) {
      // diconnected edges
      points.push(prevEdge.target)
      points.push(null)
      points.push(nextEdge.source)
      prevEdge = nextEdge
      prevSlope = nextSlope
      continue
    }

    const nodePos = nodeLayouts[node] ?? { x: 0, y: 0 }
    if (
      (state.edgeLayoutPoints[prevEdge.edgeId]?.groupWidth ?? 0) == 0 &&
      (state.edgeLayoutPoints[nextEdge.edgeId]?.groupWidth ?? 0) == 0
    ) {
      // If there is one edge in both sections:
      if (curveInNode) {
        // Make the curve with the center of the node as the control point.
        const radius = getNodeRadius(node, nodes, nodeConfig) * scale
        // Intersection of a line and the circumference of a circle
        const cp1 =
          v2d.getIntersectPointLineAndCircle(prevEdge, true, nodePos, radius) ?? prevEdge.target
        const cp2 =
          v2d.getIntersectPointLineAndCircle(nextEdge, false, nodePos, radius) ?? nextEdge.source
        points.push(cp1)
        points.push([nodePos, nodePos, cp2])
      } else {
        // Connect them at the center of the node.
        points.push(prevEdge.target)
        if (!isEqual(prevEdge.target, nextEdge.source)) {
          points.push(nextEdge.source)
        }
      }
    } else if (
      (!isFinite(prevSlope) && !isFinite(nextSlope)) ||
      Math.abs(prevSlope - nextSlope) < EPSILON
    ) {
      // For parallel lines, connect the end points of the lines.
      points.push(prevEdge.target)
      points.push(nextEdge.source)
    } else {
      if (curveInNode) {
        const radius = getNodeRadius(node, nodes, nodeConfig) * scale
        // Intersection of a line and the circumference of a circle
        const cp1 =
          v2d.getIntersectPointLineAndCircle(prevEdge, true, nodePos, radius) ?? prevEdge.target
        const cp2 =
          v2d.getIntersectPointLineAndCircle(nextEdge, false, nodePos, radius) ?? nextEdge.source

        // Is the intersection of the two lines contained in the circle?
        let cp = v2d.getIntersectionPointOfLines(prevEdge, nextEdge)
        if (!v2d.isPointContainedInCircle(cp, nodePos, radius)) {
          // not contained:
          // The intersection of the line from the intersection point to
          // the center of the circle, and the circumference of the circle
          // (with a radius of 2/3) is the control point of the curve.
          const line = { source: cp, target: nodePos }
          cp = v2d.getIntersectPointLineAndCircle(line, true, nodePos, radius * (2 / 3)) ?? nodePos
        }
        points.push(cp1)
        points.push([cp, cp, cp2])
      } else {
        // Create a path with a point on the circumference
        // (but with a radius of 1/3 for better appearance).
        const radius = getNodeRadius(node, nodes, nodeConfig) * scale * (1 / 3)
        const cp1 =
          v2d.getIntersectPointLineAndCircle(prevEdge, true, nodePos, radius) ?? prevEdge.target
        const cp2 =
          v2d.getIntersectPointLineAndCircle(nextEdge, false, nodePos, radius) ?? nextEdge.source
        points.push(cp1)
        points.push(cp2)
      }
    }

    prevEdge = nextEdge
    prevSlope = nextSlope
  }
  points.push(prevEdge.target)

  return points
}

export default defineComponent({
  components: { VPathLine },
  props: {
    paths: {
      type: Array as PropType<Paths>,
      required: true,
    },
    nodes: {
      type: Object as PropType<Nodes>,
      required: true,
    },
    edges: {
      type: Object as PropType<Edges>,
      required: true,
    },
    nodeLayouts: {
      type: Object as PropType<NodePositions>,
      required: true,
    },
  },
  setup(props) {
    const { state, edgePositions } = useEdgePositions()
    const pathConfig = usePathConfig()
    const nodeConfig = useNodeConfig()
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
        props.nodes,
        props.nodeLayouts,
        nodeConfig,
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
