import { Point } from "@/common/types"

export function translateFromDomToSvgCoordinates(
  svg: SVGSVGElement,
  viewport: SVGGElement,
  coordinates: Point
): Point {
  const point = svg.createSVGPoint()
  point.x = coordinates.x
  point.y = coordinates.y
  const svgPoint = point.matrixTransform(viewport.getCTM()?.inverse())
  return { x: svgPoint.x, y: svgPoint.y }
}

export function translateFromSvgToDomCoordinates(
  svg: SVGSVGElement,
  viewport: SVGGElement,
  coordinates: Point
): Point {
  const point = svg.createSVGPoint()
  point.x = coordinates.x
  point.y = coordinates.y
  const domPoint = point.matrixTransform(viewport.getCTM() as DOMMatrixInit)
  return { x: domPoint.x, y: domPoint.y }
}
