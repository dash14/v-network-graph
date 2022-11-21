import { Point } from "@/common/types"
import { urlContentToDataUrl } from "./download"

export interface ExportOptions {
  embedImages: boolean
}

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

export function exportSvgElement(
  element: SVGElement,
  svgViewport: SVGGElement,
  scale: number
): SVGElement {
  const target = element.cloneNode(true) as SVGElement

  const box = svgViewport.getBBox()
  const z = 1 / scale
  const svgRect = {
    x: Math.floor((box.x - 10) * z),
    y: Math.floor((box.y - 10) * z),
    width: Math.ceil((box.width + 20) * z),
    height: Math.ceil((box.height + 20) * z),
  }
  target.setAttribute("width", svgRect.width.toString())
  target.setAttribute("height", svgRect.height.toString())

  const v = target.querySelector(".v-ng-viewport") as SVGGElement
  v.setAttribute("transform", `translate(${-svgRect.x} ${-svgRect.y}), scale(${z})`)
  v.removeAttribute("style")

  target.setAttribute("viewBox", `0 0 ${svgRect.width} ${svgRect.height}`)
  target.removeAttribute("style")

  // remove comments
  const iter = document.createNodeIterator(target, NodeFilter.SHOW_COMMENT)
  while (iter.nextNode()) {
    const commentNode = iter.referenceNode
    commentNode.parentNode?.removeChild(commentNode)
  }
  return target
}

async function replaceImageSourceToDataUrl(image: SVGImageElement) {
  let useNS = false
  let href = image.getAttribute("href")
  if (!href) {
    useNS = true
    href = image.getAttribute("xlink:href")
  }
  if (!href || href.startsWith("data:")) return

  try {
    const dataUrl = await urlContentToDataUrl(href)
    image.setAttribute(useNS ? "xlink:href" : "href", dataUrl)
  } catch (e) {
    // output log and ignore
    console.warn("Image download failed.", href)
    return
  }
}

export async function exportSvgElementWithOptions(
  element: SVGElement,
  svgViewport: SVGGElement,
  scale: number,
  options: Partial<ExportOptions> = {}
): Promise<SVGElement> {
  const target = exportSvgElement(element, svgViewport, scale)

  if (options.embedImages) {
    // replace image to data-uri
    const images = Array.from(target.querySelectorAll("image"))
    const promises = images.map(img => replaceImageSourceToDataUrl(img))
    await Promise.all(promises)
  }

  return target
}
