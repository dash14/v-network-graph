import { Point } from "@dash14/svg-pan-zoom"
import { Box, NodePositions, Position, Size, ViewBox } from "@/common/types"
import { getNodesBox } from "@/modules/node/node"
import { FitContentMargin, MarginValue } from "@/common/configs"
import {
  areBoxesSame,
  boxDivide,
  boxMultiply,
  boxToViewBox,
  mergeBox,
  viewBoxToBox,
} from "@/utils/box"

// -----------------------------------------------------------------------
// Type definitions
// -----------------------------------------------------------------------

interface ZoomAt {
  zoom: number
  pos: Point
}

// -----------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------

const NUMERIC_PATTERN = new RegExp("^\\d+$")

// -----------------------------------------------------------------------
// Exported functions
// -----------------------------------------------------------------------

export function parseFitContentMargin(fitContentMargin: FitContentMargin, container: Size): Box {
  let margins = { top: 0, left: 0, right: 0, bottom: 0 }
  if (typeof fitContentMargin === "string") {
    const x = parseFitContentMarginValue(fitContentMargin, container.width)
    const y = parseFitContentMarginValue(fitContentMargin, container.height)
    if (x === undefined || y === undefined) {
      console.warn("Invalid `fitContentMargin` value.", fitContentMargin)
    } else {
      margins = { top: y, left: x, right: x, bottom: y }
    }
  } else if (typeof fitContentMargin === "number") {
    const v = fitContentMargin
    margins = { top: v, left: v, right: v, bottom: v }
  } else {
    if (fitContentMargin.top) {
      const top = parseFitContentMarginValue(fitContentMargin.top, container.height)
      if (top === undefined) {
        console.warn("Invalid `fitContentMargin` value.", fitContentMargin.top)
      } else {
        margins.top = top
      }
    }

    if (fitContentMargin.left) {
      const left = parseFitContentMarginValue(fitContentMargin.left, container.width)
      if (left === undefined) {
        console.warn("Invalid `fitContentMargin` value.", fitContentMargin.left)
      } else {
        margins.left = left
      }
    }

    if (fitContentMargin.right) {
      const right = parseFitContentMarginValue(fitContentMargin.right, container.width)
      if (right === undefined) {
        console.warn("Invalid `fitContentMargin` value.", fitContentMargin.right)
      } else {
        margins.right = right
      }
    }

    if (fitContentMargin.bottom) {
      const bottom = parseFitContentMarginValue(fitContentMargin.bottom, container.height)
      if (bottom === undefined) {
        console.warn("Invalid `fitContentMargin` value.", fitContentMargin.bottom)
      } else {
        margins.bottom = bottom
      }
    }
  }
  return margins
}

export function calculateFit(
  viewport: SVGGElement,
  container: Size,
  nodesLayouts: NodePositions,
  zoomLevel: number,
  margins: Box,
  scalingObjects: boolean
): ZoomAt | undefined {
  const viewportBox: ViewBox = viewport.getBBox()

  if (scalingObjects) {
    return calculateFitWithScalingObjects(viewportBox, container, nodesLayouts, margins)
  } else {
    const graphBox = getGraphBox(viewport)
    return calculateFitWithoutScalingObjects(
      viewportBox,
      graphBox,
      container,
      nodesLayouts,
      zoomLevel,
      margins
    )
  }
}

// -----------------------------------------------------------------------
// Local functions
// -----------------------------------------------------------------------

function parseFitContentMarginValue(
  marginValue: MarginValue,
  baseSize: number
): number | undefined {
  if (typeof marginValue === "string") {
    if (marginValue.endsWith("%")) {
      const value = parseInt(marginValue.toString())
      if (Number.isFinite(value)) {
        return baseSize * (value / 100.0)
      }
    } else if (marginValue.endsWith("px") || NUMERIC_PATTERN.test(marginValue)) {
      const value = parseInt(marginValue.toString())
      if (Number.isFinite(value)) {
        return value
      }
    }
  } else if (typeof marginValue === "number") {
    return marginValue
  }
  return undefined
}

function getGraphBox(viewport: SVGGElement): ViewBox {
  const rects = Array.from(viewport.querySelectorAll<SVGGElement>(".v-ng-graph-objects")).map(g =>
    g.getBBox()
  )
  return rects.reduce(
    (accum, r, i) => {
      if (i === 0) return r
      const x = Math.min(accum.x, r.x)
      const y = Math.min(accum.y, r.y)
      return {
        x,
        y,
        width: Math.max(accum.x + accum.width - x, r.x + r.width - x),
        height: Math.max(accum.y + accum.height - y, r.y + r.height - y),
      }
    },
    { x: 0, y: 0, width: 0, height: 0 }
  )
}

function calculateFitWithScalingObjects(
  viewport: ViewBox,
  container: Size,
  nodesLayouts: NodePositions,
  margins: Box
): ZoomAt | undefined {
  if (Object.keys(nodesLayouts).length <= 1) {
    return undefined
  }

  const zoom = calculateZoomLevelForFixedBox(viewport, container, margins)
  if (zoom > 0) {
    const box = viewBoxToBox(viewport)
    return {
      zoom,
      pos: calculatePanForCentering(box, zoom, container, margins),
    }
  } else {
    return undefined
  }
}

function calculateFitWithoutScalingObjects(
  viewport: ViewBox,
  graphBox: ViewBox,
  container: Size,
  nodesLayouts: NodePositions,
  zoomLevel: number,
  margins: Box
): ZoomAt | undefined {
  if (Object.keys(nodesLayouts).length <= 1) {
    return undefined
  }

  // For regions of the graph objects (i.e., nodes, edges, paths, labels),
  // assume that all outside of the center of a node will change size
  // according to the zoom value.
  // 1. Calculate the pixels from the center of the nodes to the edges
  //    of the graph area.
  const nodesBox = getNodesBox(nodesLayouts)
  const fixedSizes = {
    top: (nodesBox.top - graphBox.y) * zoomLevel,
    left: (nodesBox.left - graphBox.x) * zoomLevel,
    right: (graphBox.x + graphBox.width - nodesBox.right) * zoomLevel,
    bottom: (graphBox.y + graphBox.height - nodesBox.bottom) * zoomLevel,
  }

  // 2. Get the zoom value to be calculated from the viewport.
  // The viewport is the entire area including the background layer.
  // Since the background image may be further out than the graph elements,
  // a fixed scale viewport is also used to calculate the zoom value.
  let zoom = calculateZoomLevelForFixedBox(viewport, container, margins)
  if (zoom === 0) {
    return undefined
  }

  // 3. Calculate the zoom value and the pixel size of the display area.
  // Calculate several times until the zoom value stabilizes, since the
  // size of the graph elements changes according to the zoom value and
  // the calculation of the zoom value depends on the size of the entire
  // area.
  const viewportBox = viewBoxToBox(viewport)
  const target = calculateSizeWithoutMargin(container, margins)
  const hasOnlyGraphLayer = areBoxesSame(viewport, graphBox)

  let i = 0
  let lastZoom = 0
  let box: Box = { top: 0, left: 0, right: 0, bottom: 0 }
  do {
    lastZoom = zoom
    const zoomed = boxDivide(fixedSizes, zoom)
    const zoomedBox: Box = {
      top: nodesBox.top - zoomed.top,
      left: nodesBox.left - zoomed.left,
      right: nodesBox.right + zoomed.right,
      bottom: nodesBox.bottom + zoomed.bottom,
    }
    // The graph area to which the zoom is applied is not necessarily
    // contained within the background layer, so merge size.
    box = hasOnlyGraphLayer ? zoomedBox : mergeBox(viewportBox, zoomedBox)
    const viewBox = boxToViewBox(box)
    const zooms = [target.width / viewBox.width, target.height / viewBox.height]
    const availableZooms = zooms.filter(z => z > 0)
    if (availableZooms.length === 0) {
      return undefined
    }
    zoom = Math.min(...availableZooms)
    i++
  } while (Math.abs(lastZoom - zoom) > 0.000001 && i < 10)

  return {
    zoom,
    pos: calculatePanForCentering(box, zoom, container, margins),
  }
}

function calculateZoomLevelForFixedBox(box: ViewBox, container: Size, margins: Box): number {
  if (box.width === 0 || box.height === 0) return 0
  const target = calculateSizeWithoutMargin(container, margins)
  const zooms = [target.width / box.width, target.height / box.height]
  if (zooms.findIndex(z => z <= 0) >= 0) {
    return 0
  }
  return Math.min(...zooms)
}

function calculatePanForCentering(box: Box, zoom: number, container: Size, margins: Box): Position {
  const target = calculateSizeWithoutMargin(container, margins)
  const zoomed = boxToViewBox(boxMultiply(box, zoom))
  const offsetX = (target.width - zoomed.width) / 2
  const offsetY = (target.height - zoomed.height) / 2

  const left = zoomed.x - margins.left
  const top = zoomed.y - margins.top

  return {
    x: -left + offsetX,
    y: -top + offsetY,
  }
}

function calculateSizeWithoutMargin(container: Size, margins: Box): Size {
  const marginX = margins.left + margins.right
  const marginY = margins.top + margins.bottom
  return {
    width: container.width - marginX,
    height: container.height - marginY,
  }
}

if (import.meta.env.MODE == "test") {
  module.exports.exportedForTesting = {
    calculateSizeWithoutMargin,
    calculatePanForCentering,
    calculateZoomLevelForFixedBox,
  }
}
