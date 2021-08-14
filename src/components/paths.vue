<template>
  <g class="v-paths">
    <v-path-line
      v-for="(path, i) in pathList"
      :key="i"
      :points="calcPathPoints(path)"
      :class="{ clickable: pathConfig.clickable }"
      :config="getStyleConfig(path.path)"
    />
  </g>
</template>

<script lang="ts">
import { computed, defineComponent, PropType } from "vue"
import { Edge, Edges, LinePosition, NodePositions, Nodes, Position } from "../common/types"
import { Path, Paths } from "../common/types"
import { useNodeConfig, usePathConfig } from "../composables/style"
import { EdgeGroupState, EdgePositionGetter, useEdgePositions } from "../composables/edge"
import { useZoomLevel } from "../composables/zoom"
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

function calculatePathPoints(
  path: PathObject,
  nodes: Nodes,
  nodeLayouts: NodePositions,
  nodeConfig: NodeConfig,
  state: EdgeGroupState,
  edgePositions: EdgePositionGetter,
  scale: number
) {
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
        const next = [edges[1].edge.source, edges[1].edge.target]
        isForward = next.includes(target)
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
  let currentEdge = getEdgePositions(edges[0].edgeId, edgePos[0], directions[0])
  let current = getSlopeAndIntercept(currentEdge)
  const points = [currentEdge.source]
  for (let i = 1; i < length; i++) {
    const nextEdge = getEdgePositions(edges[i].edgeId, edgePos[i], directions[i])
    const next = getSlopeAndIntercept(nextEdge)

    const node = directions[i] ? edges[i].edge.source : edges[i].edge.target
    const nodePos = nodeLayouts[node] ?? { x: 0, y: 0 }

    if (
      (state.edgeLayoutPoints[currentEdge.edgeId]?.groupWidth ?? 0) == 0 &&
      (state.edgeLayoutPoints[nextEdge.edgeId]?.groupWidth ?? 0) == 0
    ) {
      // If there is one edge in both sections, connect them at the center of the node.
      points.push(currentEdge.target)
      if (!isEqual(currentEdge.target, nextEdge.source)) {
        points.push(nextEdge.source)
      }
    } else if (
      (!isFinite(current.slope) && !isFinite(next.slope)) ||
      Math.abs(current.slope - next.slope) < EPSILON
    ) {
      // For parallel lines, connect the end points of the lines.
      points.push(currentEdge.target)
      points.push(nextEdge.source)
    } else {
      // For smooth lines, connect 1/3 of the radius of the inscribed circle within a node.
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
      points.push(
        v2d.getIntersectPointLineAndCircle(currentEdge, true, nodePos, (radius * scale) / 3) ??
          currentEdge.target
      )
      points.push(
        v2d.getIntersectPointLineAndCircle(nextEdge, false, nodePos, (radius * scale) / 3) ??
          nextEdge.source
      )
    }

    currentEdge = nextEdge
    current = next
  }
  points.push(currentEdge.target)

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

    const calcPathPoints = computed(() => (path: PathObject): Position[] => {
      if (path.edges.length === 0) return []
      return calculatePathPoints(
        path,
        props.nodes,
        props.nodeLayouts,
        nodeConfig,
        state,
        edgePositions.value,
        scale.value
      )
    })

    const getStyleConfig = computed(() => (path: Path) => {
      return Config.values(pathConfig.path, path)
    })

    return { pathConfig, pathList, calcPathPoints, getStyleConfig }
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

function getSlopeAndIntercept(pos: EdgePosition) {
  const slope = (pos.target.y - pos.source.y) / (pos.target.x - pos.source.x)
  if (slope === Infinity) {
    return { slope, intercept: Infinity }
  } else {
    const intercept = pos.source.y - slope * pos.source.x
    return { slope, intercept }
  }
}
</script>

<style lang="scss" scoped>
.v-path-line {
  pointer-events: none;
  &.clickable {
    pointer-events: all;
  }
}
</style>
