<script setup lang="ts">
import { onMounted, ref, watchEffect } from "vue"
import { Point, Size } from "@/common/types"
import { useViewConfig } from "@/composables/config"
import { useContainers } from "@/composables/container"
import { useEventEmitter } from "@/composables/event-emitter"
import { useZoomLevel } from "@/composables/zoom"

// [index, pos, start, end, attrs][]
type LineDefinitions = [number, number, number, number, Record<string, any>][]

const { container, svgPanZoom } = useContainers()
const { zoomLevel } = useZoomLevel()
const emitter = useEventEmitter()
const config = useViewConfig()

// left-top point in SVG coordinates
const basePoint = ref<Point>({ x: 0, y: 0 })

// container size in pixel
const viewport = ref<Size>({ width: 500, height: 500 })

onMounted(() => {
  const pan = svgPanZoom.value?.getPan()
  if (pan) {
    basePoint.value = {
      x: -pan.x,
      y: -pan.y,
    }
  }
  const rect = container.value.getBoundingClientRect()
  viewport.value = {
    width: rect.width,
    height: rect.height,
  }
})

emitter.on("view:resize", rect => {
  viewport.value = { width: rect.width, height: rect.height }
})

emitter.on("view:pan", pan => {
  basePoint.value = { x: -pan.x, y: -pan.y }
})

emitter.on("view:zoom", () => {
  const pan = svgPanZoom.value?.getPan()
  if (pan) {
    basePoint.value = { x: -pan.x, y: -pan.y }
  }
})

const thickVerticals = ref<LineDefinitions>([])
const thickHorizontals = ref<LineDefinitions>([])
const normalVerticals = ref<LineDefinitions>([])
const normalHorizontals = ref<LineDefinitions>([])

// make grid lines
watchEffect(() => {
  const thickH: LineDefinitions = []
  const thickV: LineDefinitions = []
  const normalH: LineDefinitions = []
  const normalV: LineDefinitions = []

  const s = 1 / zoomLevel.value
  const gi = config.grid.interval
  const x = basePoint.value.x * s
  const y = basePoint.value.y * s
  const width = Math.floor(viewport.value.width / gi + 1) * gi
  const height = Math.floor(viewport.value.height / gi + 1) * gi
  const maxWidth = (basePoint.value.x + width) * s
  const maxHeight = (basePoint.value.y + height) * s
  const inc = config.grid.thickIncrements // interval to make the line thicker
  const normalDasharray = config.grid.line.dasharray
  const thickDasharray = config.grid.thick.dasharray

  let thickAttrs = {
    stroke: config.grid.thick.color,
    "stroke-width": config.grid.thick.width,
    "stroke-dasharray": thickDasharray,
    "stroke-dashoffset": thickDasharray ? x / s : undefined,
  }

  let normalAttrs = {
    stroke: config.grid.line.color,
    "stroke-width": config.grid.line.width,
    "stroke-dasharray": normalDasharray,
    "stroke-dashoffset": normalDasharray ? x / s : undefined,
  }

  // horizontal lines
  const w = (basePoint.value.x + width) * s
  for (let i = y; i <= maxHeight; i += gi) {
    const index = Math.floor(i / gi)
    if (inc && index % inc === 0) {
      thickH.push([index, index * gi, x, w, thickAttrs])
    } else {
      normalH.push([index, index * gi, x, w, normalAttrs])
    }
  }

  thickAttrs = { ...thickAttrs }
  thickAttrs["stroke-dashoffset"] = thickDasharray ? y / s : undefined

  normalAttrs = { ...normalAttrs }
  normalAttrs["stroke-dashoffset"] = normalDasharray ? y / s : undefined

  // vertical lines
  const h = (basePoint.value.y + height) * s
  for (let i = x; i <= maxWidth; i += gi) {
    const index = Math.floor(i / gi)
    if (inc && index % inc === 0) {
      thickV.push([index, index * gi, y, h, thickAttrs])
    } else {
      normalV.push([index, index * gi, y, h, normalAttrs])
    }
  }

  thickHorizontals.value = thickH
  thickVerticals.value = thickV
  normalHorizontals.value = normalH
  normalVerticals.value = normalV
})
</script>

<template>
  <g class="v-ng-background-grid" shape-rendering="crispEdges">
    <!-- normal -->
    <path
      v-for="[i, v, x, w, attrs] in normalHorizontals"
      :key="`nv${i}`"
      :d="`M ${x} ${v} L ${w} ${v}`"
      v-bind="attrs"
      style="vector-effect: non-scaling-stroke"
    />
    <path
      v-for="[i, v, y, h, attrs] in normalVerticals"
      :key="`nh${i}`"
      :d="`M ${v} ${y} L ${v} ${h}`"
      v-bind="attrs"
      style="vector-effect: non-scaling-stroke"
    />
    <!-- thick -->
    <path
      v-for="[i, v, x, w, attrs] in thickHorizontals"
      :key="`tv${i}`"
      :d="`M ${x} ${v} L ${w} ${v}`"
      v-bind="attrs"
      style="vector-effect: non-scaling-stroke"
    />
    <path
      v-for="[i, v, y, h, attrs] in thickVerticals"
      :key="`th${i}`"
      :d="`M ${v} ${y} L ${v} ${h}`"
      v-bind="attrs"
      style="vector-effect: non-scaling-stroke"
    />
  </g>
</template>

<style lang="scss">
.v-ng-background-grid {
  pointer-events: none;
}
</style>
