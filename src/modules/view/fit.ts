import { Point } from "@dash14/svg-pan-zoom"
import { Box, NodePositions, Size, ViewBox } from "@/common/types"
import { getNodesBox } from "@/modules/node/node"

interface ZoomAt {
  zoom: number
  pos: Point
}

export function calcFit(
  viewport: ViewBox,
  container: Size,
  nodesLayouts: NodePositions,
  zoomLevel: number,
  margins: Box,
  scalingObjects: boolean
): ZoomAt | undefined {
  if (scalingObjects) {
    return calcFitWithScalingObjects(viewport, container, nodesLayouts, zoomLevel, margins)
  } else {
    return calcFitWithoutScalingObjects(viewport, container, nodesLayouts, zoomLevel, margins)
  }
}

function calcFitWithScalingObjects(
  viewport: ViewBox,
  container: Size,
  nodesLayouts: NodePositions,
  zoomLevel: number,
  margins: Box
): ZoomAt | undefined {
  if (Object.keys(nodesLayouts).length <= 1) {
    return undefined
  }

  const marginX = margins.left + margins.right
  const marginY = margins.top + margins.bottom
  const targetW = container.width - marginX
  const targetH = container.height - marginY
  const fixedX = viewport.width * zoomLevel
  const fixedY = viewport.height * zoomLevel

  const zooms = [targetW / fixedX, targetH / fixedY]
  const availableZooms = zooms.filter(z => z > 0)
  if (availableZooms.length > 0) {
    const zoom = Math.min(...availableZooms)
    const width = fixedX * zoom
    const height = fixedY * zoom
    const offsetX = (targetW - width) / 2
    const offsetY = (targetH - height) / 2
    const left = viewport.x * zoom + margins.left
    const top = viewport.y * zoom + margins.top
    return {
      zoom,
      pos: {
        x: -left + offsetX,
        y: -top + offsetY,
      },
    }
  } else {
    return undefined
  }
}

function calcFitWithoutScalingObjects(
  viewport: ViewBox,
  container: Size,
  nodesLayouts: NodePositions,
  zoomLevel: number,
  margins: Box
): ZoomAt | undefined {
  if (Object.keys(nodesLayouts).length <= 1) {
    return undefined
  }

  // Assume that all elements outside the center of the node change
  // size according to the zoom value.
  // 1. Calculate the pixels from the center of the nodes to the edges
  //    of the viewport
  const nodesBox = getNodesBox(nodesLayouts)
  const fixedSizes = {
    top: (nodesBox.top - viewport.y) * zoomLevel,
    left: (nodesBox.left - viewport.x) * zoomLevel,
    right: (viewport.x + viewport.width - nodesBox.right) * zoomLevel,
    bottom: (viewport.y + viewport.height - nodesBox.bottom) * zoomLevel,
  }

  // 2. Calculate the display area excluding the fixed pixel size
  const marginX = margins.left + margins.right
  const marginY = margins.top + margins.bottom
  const fixedX = fixedSizes.left + fixedSizes.right
  const fixedY = fixedSizes.top + fixedSizes.bottom
  const targetW = container.width - marginX - fixedX
  const targetH = container.height - marginY - fixedY

  // 3. Calculate the zoom level using the area size within the center of the nodes
  const nodesAreaW = nodesBox.right - nodesBox.left
  const nodesAreaH = nodesBox.bottom - nodesBox.top
  const zooms = [targetW / nodesAreaW, targetH / nodesAreaH]

  const availableZooms = zooms.filter(z => z > 0)
  if (availableZooms.length > 0) {
    const zoom = Math.min(...availableZooms)

    // 3. Calculate the pan amount from the center position
    const width = nodesAreaW * zoom + fixedX
    const height = nodesAreaH * zoom + fixedY
    const offsetX = (container.width - marginX - width) / 2
    const offsetY = (container.height - marginY - height) / 2
    const left = nodesBox.left * zoom - (margins.left + fixedSizes.left)
    const top = nodesBox.top * zoom - (margins.top + fixedSizes.top)
    return {
      zoom,
      pos: {
        x: -left + offsetX,
        y: -top + offsetY,
      },
    }
  } else {
    return undefined
  }
}
