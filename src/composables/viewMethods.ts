import type { Emitter } from "mitt"
import type { Ref } from "vue"
import { nonNull } from "@/common/common"
import { Configs, FitContentMargin } from "@/common/configs"
import { Events, Nodes, Point, Sizes } from "@/common/types"
import { Box } from "@/modules/svg-pan-zoom-ex"
import { calculateFit, parseFitContentMargin } from "@/modules/view/fit"
import { asyncNextTick } from "@/modules/vue/nextTick"
import * as svgUtils from "@/utils/svg"
import { exportSvgElement, exportSvgElementWithOptions, ExportOptions } from "@/utils/svg"
import type { GraphCanvas } from "./canvas"
import type { CurrentPositions } from "./currentPositions"

/**
 * Make the methods of a graph that move and export its view.
 * @param canvas the canvas of the graph
 * @param zoomLevel the zoom level, bound to the prop
 * @param nodes the nodes
 * @param currentPositions where the nodes are now
 * @param configs the configs of the graph
 * @param emitter the event emitter of the graph
 * @returns the methods
 */
export function useViewMethods(
  canvas: GraphCanvas,
  zoomLevel: Ref<number>,
  nodes: Ref<Nodes>,
  currentPositions: CurrentPositions,
  configs: Configs,
  emitter: Emitter<Events>
) {
  const { svg, viewport, svgPanZoom, applyAbsoluteZoomLevel, scale } = canvas

  // To resolve the problem that the center position and
  // magnification rate may not be recognized.
  const updateBorderBox = async () => {
    if (Object.keys(nodes.value).length > 0) {
      svgPanZoom.value?.updateBBox()
      await asyncNextTick()
    }
  }

  // Scales the content to fit in the SVG area.
  const fitToContents = async (options?: { margin?: FitContentMargin }) => {
    const fitContentMargin =
      !options || options.margin === undefined ? configs.view.fitContentMargin : options.margin

    await updateBorderBox()

    const rect = nonNull(svg.value).getBoundingClientRect()
    const margins = parseFitContentMargin(fitContentMargin, rect)

    const result = calculateFit(
      nonNull(viewport.value),
      rect,
      currentPositions.all(),
      zoomLevel.value,
      margins,
      configs.view.scalingObjects
    )

    if (result) {
      applyAbsoluteZoomLevel(result.zoom)
      svgPanZoom.value?.pan(result.pos)
    } else {
      svgPanZoom.value?.center()
    }
    emitter.emit("view:fit", undefined)
  }

  // Place content in the center of the SVG area.
  const panToCenter = async () => {
    await updateBorderBox()
    svgPanZoom.value?.center()
  }

  // Get viewport box
  const getViewBox = () =>
    svgPanZoom.value?.getViewBox() ?? {
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
    }

  // Get viewport box
  const setViewBox = (box: Box) => svgPanZoom.value?.setViewBox(box)

  /**
   * Zoom in
   */
  function zoomIn() {
    svgPanZoom.value?.zoomIn()
  }

  /**
   * Zoom out
   */
  function zoomOut() {
    svgPanZoom.value?.zoomOut()
  }

  /**
   * Pan to a rendered position
   * @return {Point} point to pan
   */
  function panTo(point: Point) {
    svgPanZoom.value?.pan(point)
  }

  /**
   * Relatively pan the graph by a specified rendered position vector
   * @return {Point} relative point to pan
   */
  function panBy(point: Point) {
    svgPanZoom.value?.panBy(point)
  }

  /**
   * Get pan vector
   * @return {Point} pan vector
   */
  function getPan(): Point {
    return nonNull(svgPanZoom.value).getPan()
  }

  /**
   * Get all calculate svg dimensions
   */
  function getSizes(): Sizes {
    const sizes = nonNull(svgPanZoom.value).getSizes()
    return {
      width: sizes.width,
      height: sizes.height,
      viewBox: sizes.viewBox,
    }
  }

  /**
   * Translate from DOM to SVG coordinates
   * @return {Point} coordinates in the SVG
   */
  function translateFromDomToSvgCoordinates(coordinates: Point): Point {
    return svgUtils.translateFromDomToSvgCoordinates(
      nonNull(svg.value, "svg"),
      nonNull(viewport.value, "viewport"),
      coordinates
    )
  }

  /**
   * Translate from SVG to DOM coordinates
   * @return {Point} coordinates in the DOM
   */
  function translateFromSvgToDomCoordinates(coordinates: Point): Point {
    return svgUtils.translateFromSvgToDomCoordinates(
      nonNull(svg.value, "svg"),
      nonNull(viewport.value, "viewport"),
      coordinates
    )
  }

  /**
   * Get graph as SVG text.
   * @return {string} SVG text
   * @deprecated
   */
  function getAsSvg(): string {
    const target = exportSvgElement(
      nonNull(svg.value, "svg"),
      nonNull(viewport.value, "viewport"),
      scale.value
    )
    return target.outerHTML
  }

  /**
   * Export graph as SVG text.
   * @return {string} SVG text
   */
  async function exportAsSvgText(options: Partial<ExportOptions> = {}): Promise<string> {
    const target = exportAsSvgElement(options)
    return (await target).outerHTML
  }

  /**
   * Export graph as SVG element.
   * @return {SVGElement} SVG element
   */
  async function exportAsSvgElement(options: Partial<ExportOptions> = {}): Promise<SVGElement> {
    return exportSvgElementWithOptions(
      nonNull(svg.value, "svg"),
      nonNull(viewport.value, "viewport"),
      scale.value,
      options
    )
  }

  return {
    updateBorderBox,
    fitToContents,
    panToCenter,
    getViewBox,
    setViewBox,
    zoomIn,
    zoomOut,
    panTo,
    panBy,
    getPan,
    getSizes,
    translateFromDomToSvgCoordinates,
    translateFromSvgToDomCoordinates,
    getAsSvg,
    exportAsSvgText,
    exportAsSvgElement,
  }
}

export type ViewMethods = ReturnType<typeof useViewMethods>
