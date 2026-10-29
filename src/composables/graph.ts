import { isEqual } from "lodash-es"
import type { Ref } from "vue"
import { computed, onBeforeUpdate, readonly, ref, shallowRef, toRaw, toRef, watch } from "vue"
import { Reactive, nonNull } from "@/common/common"
import { Configs, UserConfigs } from "@/common/configs"
import {
  EventHandlers,
  Edges,
  LayerName,
  Layers,
  Layouts,
  Nodes,
  Paths,
  UserLayouts,
} from "@/common/types"
import { bindProp, bindPropKeySet } from "@/utils/props"
import { isMouseWheelZoomEnabled, useGraphCanvas } from "./canvas"
import { provideConfigs } from "./config"
import { provideCurrentPositions } from "./currentPositions"
import { provideEventEmitter } from "./event-emitter"
import { useGraphLoading } from "./graphLoading"
import { GRAPH_SYSTEM_SLOTS, LayerSlots, useBuiltInLayerOrder, useLayerDefs } from "./layer"
import { useLayoutsBinding } from "./layout"
import { makeMarkerState } from "./marker"
import { provideMouseOperation } from "./mouse"
import { providePositionWriter } from "./positionWriter"
import { provideSelections } from "./selection"
import { makeStateInput, provideStates } from "./state"
import { useViewMethods } from "./viewMethods"
import { useViewMode } from "./viewMode"

/** The props that every graph takes. */
export interface GraphProps {
  nodes: Nodes
  edges: Edges
  layouts: UserLayouts
  zoomLevel: number
  selectedNodes: string[]
  selectedEdges: string[]
  layers: Layers
  eventHandlers: EventHandlers
}

/** The events that every graph emits. */
export interface GraphEmit {
  (e: "update:zoomLevel", v: number): void
  (e: "update:layouts", v: Layouts): void
  (e: "update:selectedNodes", v: string[]): void
  (e: "update:selectedEdges", v: string[]): void
}

/** Path support, given only by VNetworkGraph. */
export interface GraphPaths {
  objects: Ref<Paths>
  isInCompatibilityMode: Ref<boolean>
  /** The props and emit of the graph, for binding the selected paths. */
  props: { selectedPaths: string[] }
  emit: { (e: "update:selectedPaths", v: string[]): void }
}

/** Configs that also hold view.layoutsUpdateInterval. */
export type DrawAheadConfigs = Configs & { view: { layoutsUpdateInterval: number } }

export interface GraphOptions {
  configs: Ref<UserConfigs>
  slots: Readonly<LayerSlots>
  builtInLayers?: Readonly<LayerName[]>
  /** Path support, given only by VNetworkGraph. */
  paths?: GraphPaths
  /**
   * Default configs of a graph that draws layout ticks before updating the layouts prop, which is
   * costly. Given only by the lite graph.
   */
  drawAheadDefaults?: () => DrawAheadConfigs
}

/**
 * Set up the state and behavior shared by both graphs; each component renders its own objects.
 * @param props the props of the graph
 * @param emit the function to emit the events of the graph
 * @param options what differs between the graphs
 * @returns what the template of the graph and its methods use
 */
export function useGraph(props: GraphProps, emit: GraphEmit, options: GraphOptions) {
  const nodesRef = toRef(props, "nodes")
  const edgesRef = toRef(props, "edges")
  const pathsRef = options.paths?.objects ?? ref<Paths>({})

  // Event Bus
  const emitter = provideEventEmitter()
  Object.entries(props.eventHandlers).forEach(([type, event]) => {
    emitter.on(type as any, event as any)
  })

  // Style settings
  const drawAheadDefaults = options.drawAheadDefaults
  const drawAheadConfigs = drawAheadDefaults
    ? provideConfigs(options.configs, drawAheadDefaults)
    : undefined
  const configs: Configs = drawAheadConfigs ?? provideConfigs(options.configs)

  // The slots object is not reactive. The layers follow these names, synced before each update, so
  // that slots given or taken away after mount are drawn or removed.
  const slotNames = shallowRef(Object.keys(options.slots))
  onBeforeUpdate(() => {
    const names = Object.keys(options.slots)
    if (!isEqual(names, slotNames.value)) slotNames.value = names
  })

  // Additional layers
  const { layerDefs, isShowGrid, isShowBackgroundViewport } = useLayerDefs(
    configs,
    slotNames,
    () => props.layers,
    GRAPH_SYSTEM_SLOTS
  )

  const builtInLayerOrder = useBuiltInLayerOrder(configs, slotNames, options.builtInLayers)

  // -----------------------------------------------------------------------
  // SVG
  // -----------------------------------------------------------------------
  const zoomLevel = bindProp(props, "zoomLevel", emit, v => {
    v = Math.max(v, configs.view.minZoomLevel)
    v = Math.min(v, configs.view.maxZoomLevel)
    return v
  })

  const canvas = useGraphCanvas(zoomLevel, () => props.zoomLevel, configs, emitter)
  const { svg, viewport, svgPanZoom, scale } = canvas

  // -----------------------------------------------------------------------
  // States of selected nodes/edges
  // -----------------------------------------------------------------------
  const currentSelectedNodes = bindPropKeySet(props, "selectedNodes", nodesRef, emit)
  watch(currentSelectedNodes, nodes => emitter.emit("node:select", Array.from(nodes)))

  const currentSelectedEdges = bindPropKeySet(props, "selectedEdges", edgesRef, emit)
  watch(currentSelectedEdges, edges => emitter.emit("edge:select", Array.from(edges)))

  const currentSelectedPaths = options.paths
    ? bindPropKeySet(options.paths.props, "selectedPaths", pathsRef, options.paths.emit)
    : Reactive(new Set<string>())
  if (options.paths) {
    watch(currentSelectedPaths, paths => emitter.emit("path:select", Array.from(paths)))
  }

  provideSelections(currentSelectedNodes, currentSelectedEdges, currentSelectedPaths)

  const hoveredNodes = Reactive(new Set<string>())
  const hoveredEdges = Reactive(new Set<string>())
  const hoveredPaths = Reactive(new Set<string>())
  const currentLayouts = useLayoutsBinding(() => props.layouts)
  const currentPositions = provideCurrentPositions(currentLayouts)

  // -----------------------------------------------------------------------
  // SVG Markers
  // -----------------------------------------------------------------------
  const markerState = makeMarkerState()

  // -----------------------------------------------------------------------
  // Mouse processing
  // -----------------------------------------------------------------------

  const { dragging, touches } = useViewMode(svgPanZoom, configs, emitter)

  const {
    nodeStates,
    edgeStates,
    pathStates,
    positionChanges,
    layoutsChanged,
    edgeGeometries,
    placeEdgesAhead,
  } = provideStates(
    makeStateInput(nodesRef, currentSelectedNodes, hoveredNodes),
    makeStateInput(edgesRef, currentSelectedEdges, hoveredEdges),
    makeStateInput(pathsRef, currentSelectedPaths, hoveredPaths),
    readonly(configs),
    currentLayouts,
    () => props.layouts,
    markerState,
    scale,
    currentPositions
  )
  const { makePositionDrawer, flushPositions } = providePositionWriter(
    currentPositions,
    edgeGeometries,
    positionChanges,
    viewport
  )
  // The tracking of the positions compares every position anyway, so it tells of the changes.
  watch(layoutsChanged, () => emit("update:layouts", currentLayouts))

  const isSvgWheelZoomEnabled = computed(() => isMouseWheelZoomEnabled(configs.view))

  // mouse and touch support
  const { isBoxSelectionMode, selectionBox, startBoxSelection, stopBoxSelection } =
    provideMouseOperation(
      svg,
      currentPositions.of,
      readonly(zoomLevel),
      nodeStates,
      edgeStates,
      pathStates,
      currentSelectedNodes,
      currentSelectedEdges,
      currentSelectedPaths,
      hoveredNodes,
      hoveredEdges,
      hoveredPaths,
      options.paths?.isInCompatibilityMode ?? ref(false),
      isSvgWheelZoomEnabled,
      configs,
      emitter
    )

  // -----------------------------------------------------------------------
  // View methods and loading
  // -----------------------------------------------------------------------

  const view = useViewMethods(canvas, zoomLevel, nodesRef, currentPositions, configs, emitter)

  const positionDrawer = drawAheadConfigs
    ? makePositionDrawer(
        () => drawAheadConfigs.view.layoutsUpdateInterval,
        () => zoomLevel.value,
        placeEdgesAhead
      )
    : undefined

  useGraphLoading(canvas, view, nodesRef, configs, emitter, () => ({
    layouts: Reactive(currentLayouts.nodes), // deprecated parameter.
    nodePositions: toRef(currentLayouts, "nodes"),
    nodes: nodesRef,
    edges: edgesRef,
    configs: readonly(configs),
    scale: readonly(scale),
    emitter,
    svgPanZoom: nonNull(svgPanZoom.value),
    // Left out when not given, so that a handler checking for the key finds none.
    ...(positionDrawer ? { positionDrawer } : {}),
  }))

  // The layouts may lag behind the positions drawn, so this brings them up to date first.
  // A copy, so that it stays as it was when taken.
  function getLayouts(): Layouts {
    flushPositions()
    const nodes = Object.entries(toRaw(currentLayouts).nodes).map(([id, p]) => [id, { ...p }])
    return { nodes: Object.fromEntries(nodes) }
  }

  /** The methods that every graph exposes. */
  const methods = {
    fitToContents: view.fitToContents,
    panToCenter: view.panToCenter,
    getViewBox: view.getViewBox,
    setViewBox: view.setViewBox,
    startBoxSelection,
    stopBoxSelection,
    zoomIn: view.zoomIn,
    zoomOut: view.zoomOut,
    panTo: view.panTo,
    panBy: view.panBy,
    getPan: view.getPan,
    getSizes: view.getSizes,
    translateFromDomToSvgCoordinates: view.translateFromDomToSvgCoordinates,
    translateFromSvgToDomCoordinates: view.translateFromSvgToDomCoordinates,
    exportAsSvgText: view.exportAsSvgText,
    exportAsSvgElement: view.exportAsSvgElement,
    getAsSvg: view.getAsSvg,
  }

  return {
    configs,
    layerDefs,
    isShowGrid,
    isShowBackgroundViewport,
    builtInLayerOrder,
    canvas,
    markerState,
    dragging,
    touches,
    isBoxSelectionMode,
    selectionBox,
    getLayouts,
    methods,
  }
}
