import { Box, ViewBox } from "@/common/types"

export function areBoxesSame(box1: ViewBox, box2: ViewBox): boolean {
  // Compare with sufficient precision to be considered identical,
  // taking into account the resolution at which they are displayed.
  const error = Math.max(box1.width, box1.height, box2.width, box2.height) / 10000
  return (
    Math.abs(box1.x - box2.x) < error &&
    Math.abs(box1.y - box2.y) < error &&
    Math.abs(box1.width - box2.width) < error &&
    Math.abs(box1.height - box2.height) < error
  )
}

export function boxAdd(box1: Box, box2: Box): Box {
  return {
    top: box1.top + box2.top,
    left: box1.left + box2.left,
    right: box1.right + box2.right,
    bottom: box1.bottom + box2.bottom,
  }
}

export function boxMultiply(box: Box, m: number): Box {
  return {
    top: box.top * m,
    left: box.left * m,
    right: box.right * m,
    bottom: box.bottom * m,
  }
}

export function boxDivide(box: Box, d: number): Box {
  return {
    top: box.top / d,
    left: box.left / d,
    right: box.right / d,
    bottom: box.bottom / d,
  }
}

export function viewBoxToBox(viewBox: ViewBox): Box {
  return {
    top: viewBox.y,
    left: viewBox.x,
    right: viewBox.x + viewBox.width,
    bottom: viewBox.y + viewBox.height,
  }
}

export function boxToViewBox(box: Box): ViewBox {
  return {
    x: box.left,
    y: box.top,
    width: box.right - box.left,
    height: box.bottom - box.top,
  }
}

export function mergeBox(box1: Box, box2: Box): Box {
  return {
    top: Math.min(box1.top, box2.top),
    left: Math.min(box1.left, box2.left),
    right: Math.max(box1.right, box2.right),
    bottom: Math.max(box1.bottom, box2.bottom),
  }
}
