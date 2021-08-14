<template>
  <g class="v-paths">
    <v-path-line
      v-for="(path, i) in pathList"
      :key="i"
      :points="calcPathPoints(path)"
      :class="{ clickable: pathConfig.clickable}"
      :config="getStyleConfig(path.path)"
    />
  </g>
</template>

<script lang="ts">
import { computed, defineComponent, PropType } from "vue"
import {
  Edge,
  Edges,
  LinePosition,
  NodePositions,
  Nodes,
  Path,
  Paths,
  Position,
} from "../common/types"
import { usePathConfig } from "../composables/style"
import { useNodeConfig } from "../composables/style"
import { useEdgePositions } from "../composables/edge"
import { useZoomLevel } from "../composables/zoom"
import { getShapeSize, isPositionInNode } from "../common/utility"
import { Config } from "../common/configs"
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

      // 1. Edge ID listからEdge位置のリストを得る
      const edgePos = path.edges.map(({ edgeId, edge }) =>
        edgePositions.value(edgeId, props.nodeLayouts[edge.source], props.nodeLayouts[edge.target])
      )

      // source/targetの順序を判定
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

      // 2. Edge位置リストから、実際に結んだpath のd属性を生成する
      let currentEdge = getEdgePositions(edges[0].edgeId, edgePos[0], directions[0])
      let current = getSlopeAndIntercept(currentEdge)
      const points = [currentEdge.source]
      for (let i = 1; i < length; i++) {
        const nextEdge = getEdgePositions(edges[i].edgeId, edgePos[i], directions[i])
        // 交点を計算
        const next = getSlopeAndIntercept(nextEdge)
        if (!isFinite(current.slope)) {
          // 垂直線
          if (!isFinite(next.slope)) {
            // 並行
            points.push(currentEdge.target)
            points.push(nextEdge.source)
          } else {
            const x = currentEdge.target.x
            const y = x * next.slope + next.intercept
            points.push({ x, y })
          }
        } else if (!isFinite(next.slope)) {
          // 垂直線
          const x = nextEdge.source.x
          const y = x * current.slope + current.intercept
          points.push({ x, y })
        } else if (Math.abs(current.slope - next.slope) < EPSILON) {
          // 並行
          points.push(currentEdge.target)
          if (!isEqual(currentEdge.target, nextEdge.source)) {
            points.push(nextEdge.source)
          }
        } else if (
          (state.edgeLayoutPoints[currentEdge.edgeId]?.groupWidth ?? 0) == 0 &&
          (state.edgeLayoutPoints[nextEdge.edgeId]?.groupWidth ?? 0) == 0
        ) {
          // edgeが1本ずつなら何も考えずつなげる
          points.push(currentEdge.target)
          points.push(nextEdge.source)
        } else {
          // 片方または両方がグループあり
          const x = (next.intercept - current.intercept) / (current.slope - next.slope)
          const y =
            (current.slope * next.intercept - next.slope * current.intercept) /
            (current.slope - next.slope)
          // ノード内に収まるか検査する
          const pos = { x, y }
          const node = directions[i] ? edges[i].edge.source : edges[i].edge.target
          const shape = Config.values(nodeConfig.normal, props.nodes[node])
          const pathWidth = Config.value(pathConfig.path.width, path.path)
          if (isPositionInNode(pos, props.nodeLayouts[node], shape, scale.value, pathWidth)) {
            points.push({ x, y })
          } else {
            // 交点がノードの外に出てしまう: なめらかにする
            const nodeSize = getShapeSize(shape, scale.value)
            let theta = Math.atan(current.slope)
            points.push({
              x: currentEdge.target.x - ((Math.cos(theta) * nodeSize.width) / 4) * scale.value,
              y: currentEdge.target.y - ((Math.sin(theta) * nodeSize.height) / 4) * scale.value,
            })
            theta = Math.atan(next.slope)
            points.push({
              x: nextEdge.source.x + ((Math.cos(theta) * nodeSize.width) / 4) * scale.value,
              y: nextEdge.source.y + ((Math.sin(theta) * nodeSize.height) / 4) * scale.value,
            })
          }
        }
        currentEdge = nextEdge
        current = next
      }
      points.push(currentEdge.target)

      return points
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
