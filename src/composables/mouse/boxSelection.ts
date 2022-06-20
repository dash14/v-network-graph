import { computed, onMounted, onUnmounted, ref, Ref } from "vue"
import { nonNull, Reactive } from "@/common/common"
import { NodePositions, Point, Rectangle } from "@/common/types"
import { Vector2D } from "@/modules/vector2d"
import { InteractionModes } from "./core"
import { translateFromDomToSvgCoordinates } from "@/utils/svg"
import { debounce } from "lodash-es"

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

export type StopTrigger = "pointerup" | "click" | "manual"
export type SelectionType = "append" | "invert"

type EventHandlers = {
  [K in keyof SVGElementEventMap]?: (this: SVGElement, ev: SVGElementEventMap[K]) => void
}

export interface BoxSelectionOption {
  stop: StopTrigger
  type: SelectionType
  withShiftKey: SelectionType | "same"
}

// ------------------------------------------------------------------
// Export functions
// ------------------------------------------------------------------

export function makeBoxSelectionMethods(
  container: Ref<SVGElement | undefined>,
  modes: InteractionModes,
  nodePositions: Readonly<NodePositions>,
  selectedNodes: Reactive<Set<string>>
) {
  const isBoxSelectionMode = computed(() => modes.viewMode.value === "box-selection")

  // ------------------------------------------------------------------
  // Constants
  // ------------------------------------------------------------------
  const eventHandlers: EventHandlers = {
    pointerdown: handlePointerDownEvent,
    click: handleClickEvent,
    pointerenter: ignoreEvent,
    pointerleave: ignoreEvent,
  }

  const eventHandlersOnlyWhenActive: EventHandlers = {
    pointermove: handlePointerMoveEvent,
    pointerup: handlePointerUpEvent,
  }

  // ------------------------------------------------------------------
  // States
  // ------------------------------------------------------------------
  const viewport = ref<SVGGElement>()
  const selectionBox = ref<Rectangle>()
  const states = {
    pointers: new Set<number>(), // Set of pointers being pressed
    points: new Map<number, Point>(), // Point indicated by each pointer
    startPoint: null as Point | null, // Point where the drag started
    selectedNodesAtSelectStarted: new Set<string>(), // Nodes selected at the start of the selection
    selectionType: "append" as SelectionType, // Selection method for nodes included in the dragged range
    options: {
      // options specified by user at start of selection mode
      stopTrigger: "pointerup" as StopTrigger,
      selectionType: "append" as SelectionType,
      selectionTypeWithShiftKey: "same" as SelectionType | "same",
    },
  }

  // ------------------------------------------------------------------
  // Private functions
  // ------------------------------------------------------------------

  const updateNodesSelection = debounce(
    () => {
      _updateNodesSelection(
        nonNull(container.value, "container") as SVGSVGElement,
        nonNull(viewport.value, "viewport"),
        selectionBox,
        nodePositions,
        selectedNodes,
        states.selectedNodesAtSelectStarted,
        states.selectionType
      )
    },
    50,
    { maxWait: 100 }
  )

  // Event Handlers ---

  function handleClickEvent(event: MouseEvent) {
    if (states.options.stopTrigger !== "click") return
    if (states.pointers.size > 0) return

    const point = { x: event.offsetX, y: event.offsetY }
    if (states.startPoint && Vector2D.fromObject(states.startPoint).distance(point) > 10) {
      return // ignore in dragging
    }
    stopBoxSelection()
  }

  function handlePointerDownEvent(event: PointerEvent) {
    event.stopPropagation()

    const point = { x: event.offsetX, y: event.offsetY }
    if (states.pointers.size === 0) {
      states.startPoint = point

      _addEventListeners(document, eventHandlersOnlyWhenActive)
      states.selectedNodesAtSelectStarted.clear()
      selectedNodes.forEach(nodeId => states.selectedNodesAtSelectStarted.add(nodeId))
      if (states.options.selectionTypeWithShiftKey === "same") {
        states.selectionType = states.options.selectionType
      } else {
        states.selectionType = event.shiftKey
          ? states.options.selectionTypeWithShiftKey
          : states.options.selectionType
      }
    }
    if (!states.pointers.has(event.pointerId)) {
      states.pointers.add(event.pointerId)
    }
    states.points.set(event.pointerId, point)
    updateRectangle()
  }

  function handlePointerUpEvent(event: PointerEvent) {
    states.pointers.delete(event.pointerId)
    if (states.pointers.size === 1) {
      const rect = nonNull(container.value).getBoundingClientRect()
      const point = { x: event.x - rect.x, y: event.y - rect.y }
      states.startPoint = point
    } else if (states.pointers.size === 0) {
      _removeEventListeners(document, eventHandlersOnlyWhenActive)
      if (states.options.stopTrigger === "pointerup") {
        stopBoxSelection()
      }
      states.selectedNodesAtSelectStarted.clear()
    }
    updateRectangle()
  }

  function handlePointerMoveEvent(event: PointerEvent) {
    const rect = nonNull(container.value).getBoundingClientRect()
    const point = { x: event.x - rect.x, y: event.y - rect.y }
    states.points.set(event.pointerId, point)
    updateRectangle()
    updateNodesSelection()
  }

  function handleKeyDownEvent(event: KeyboardEvent) {
    if (event.key === "Escape" && states.options.stopTrigger !== "manual") {
      event.stopPropagation()
      stopBoxSelection()
    }
  }

  function ignoreEvent(event: MouseEvent) {
    event.stopPropagation()
  }

  function updateRectangle() {
    let pos1: Point | undefined
    let pos2: Point | undefined
    const pointerArray = Array.from(states.pointers)
    if (pointerArray.length >= 2) {
      const first = pointerArray[0]
      const last = pointerArray[pointerArray.length - 1]
      pos1 = states.points.get(first)
      pos2 = states.points.get(last)
    } else if (states.startPoint && pointerArray.length === 1) {
      const first = pointerArray[0]
      pos1 = states.startPoint
      pos2 = states.points.get(first)
    } else {
      pos1 = undefined
      pos2 = undefined
    }
    if (pos1 && pos2) {
      // calculate left top position and size
      selectionBox.value = {
        pos: {
          x: Math.min(pos1.x, pos2.x),
          y: Math.min(pos1.y, pos2.y),
        },
        size: {
          width: Math.abs(pos2.x - pos1.x),
          height: Math.abs(pos2.y - pos1.y),
        },
      }
      if (selectionBox.value.size.width === 0) {
        selectionBox.value.size.width = 1
      }
      if (selectionBox.value.size.height === 0) {
        selectionBox.value.size.height = 1
      }
    } else if (selectionBox.value) {
      selectionBox.value = undefined
    }
  }

  // ------------------------------------------------------------------
  // Lifecycle process
  // ------------------------------------------------------------------

  onMounted(() => {
    viewport.value = container.value?.querySelector(".v-viewport") as SVGGElement
  })

  onUnmounted(() => stopBoxSelection())

  // ------------------------------------------------------------------
  // Expose functions
  // ------------------------------------------------------------------

  function startBoxSelection(options: Partial<BoxSelectionOption> = {}) {
    // Even if it's already in selection mode, behavior changes are acceptable.
    states.options = {
      stopTrigger: options.stop ?? "pointerup",
      selectionType: options.type ?? "append",
      selectionTypeWithShiftKey: options.withShiftKey ?? "same",
    }

    if (modes.viewMode.value === "box-selection") return
    modes.viewMode.value = "box-selection"

    states.pointers.clear()

    _addEventListeners(nonNull(container.value, "container"), eventHandlers)

    document.addEventListener("keydown", handleKeyDownEvent, { capture: true, passive: false })
  }

  function stopBoxSelection() {
    if (modes.viewMode.value !== "box-selection") return
    modes.viewMode.value = "default"

    const c = nonNull(container.value, "container")
    _removeEventListeners(nonNull(container.value, "container"), eventHandlers)
    _removeEventListeners(document, eventHandlersOnlyWhenActive)

    document.removeEventListener("keydown", handleKeyDownEvent, { capture: true })
  }

  return { isBoxSelectionMode, selectionBox, startBoxSelection, stopBoxSelection }
}

// ------------------------------------------------------------------
// Package local functions
// ------------------------------------------------------------------

function _updateNodesSelection(
  svg: SVGSVGElement,
  viewport: SVGGElement,
  selectionBox: Ref<Rectangle | undefined>,
  nodePositions: Readonly<NodePositions>,
  selectedNodes: Reactive<Set<string>>,
  selectedNodesAtSelectStarted: Set<string>,
  selectionType: SelectionType
) {
  if (!selectionBox.value) return
  const box = selectionBox.value
  const pos1 = translateFromDomToSvgCoordinates(svg, viewport, box.pos)
  const pos2 = translateFromDomToSvgCoordinates(svg, viewport, {
    x: box.pos.x + box.size.width,
    y: box.pos.y + box.size.height,
  })

  // find enclosed nodes
  const enclosedNodes = new Set(
    Object.entries(nodePositions)
      .filter(([_, pos]) => {
        return pos1.x <= pos.x && pos.x <= pos2.x && pos1.y <= pos.y && pos.y <= pos2.y
      })
      .map(([nodeId, _]) => nodeId)
  )

  if (selectionType === "append") {
    enclosedNodes.forEach(nodeId => selectedNodes.add(nodeId))
    selectedNodes.forEach(nodeId => {
      if (!enclosedNodes.has(nodeId)) {
        selectedNodes.delete(nodeId)
      }
    })
  } else {
    // selectionType === "invert"
    enclosedNodes.forEach(nodeId => {
      if (selectedNodesAtSelectStarted.has(nodeId)) {
        selectedNodes.delete(nodeId)
      } else {
        selectedNodes.add(nodeId)
      }
    })
    selectedNodesAtSelectStarted.forEach(nodeId => {
      if (!enclosedNodes.has(nodeId)) {
        selectedNodes.add(nodeId)
      }
    })
    selectedNodes.forEach(nodeId => {
      if (!selectedNodesAtSelectStarted.has(nodeId) && !enclosedNodes.has(nodeId)) {
        selectedNodes.delete(nodeId)
      }
    })
  }
}

function _addEventListeners(container: SVGElement | Document, handlers: EventHandlers) {
  const options = { capture: true, passive: false }
  Object.entries(handlers).forEach(([type, handler]) => {
    // @ts-ignore
    container.addEventListener(type, handler, options)
  })
}

function _removeEventListeners(container: SVGElement | Document, handlers: EventHandlers) {
  const options = { capture: true }
  Object.entries(handlers).forEach(([type, handler]) => {
    // @ts-ignore
    container.removeEventListener(type, handler, options)
  })
}
