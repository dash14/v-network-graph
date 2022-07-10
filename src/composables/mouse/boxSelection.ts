import { computed, onMounted, onUnmounted, ref, Ref, watch } from "vue"
import { debounce } from "lodash-es"
import { nonNull, Reactive } from "@/common/common"
import { Configs } from "@/common/configs"
import { Layouts, NodePositions, Point, Rectangle } from "@/common/types"
import { Vector2D } from "@/modules/vector2d"
import { NodeStates } from "@/models/node"
import { translateFromDomToSvgCoordinates } from "@/utils/svg"
import { InteractionModes } from "./core"

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

export type StopTrigger = "pointerup" | "click" | "manual"
export type SelectionType = "append" | "invert"

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
  layouts: Readonly<Layouts>,
  nodeStates: NodeStates,
  selectedNodes: Reactive<Set<string>>,
  configs: Configs
) {
  const isBoxSelectionEnabled = computed(
    () => !!configs.node.selectable && configs.view.boxSelectionEnabled
  )
  const isBoxSelectionMode = computed(() => modes.viewMode.value === "box-selection")

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
        layouts.nodes,
        nodeStates,
        selectedNodes,
        states.selectedNodesAtSelectStarted,
        states.selectionType
      )
    },
    50,
    { maxWait: 100 }
  )

  // ------------------------------------------------------------------
  // Pointer event handlers
  // ------------------------------------------------------------------
  const pointerEventHandler = new PointerEventRegistrar(
    container,
    handlePointerDownEvent,
    handlePointerUpEvent,
    handlePointerMoveEvent,
    handleClickEvent,
    handleKeyDownEvent
  )

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

      pointerEventHandler.activate()

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
      pointerEventHandler.deactivate()
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
  // Ctrl/Cmd key box selection
  // ------------------------------------------------------------------
  const keyEventRegistrar = new KeyEventRegistrar(
    container,
    // key down
    (event: KeyboardEvent) => {
      if (!isBoxSelectionEnabled.value) return
      if (configs.view.selection.detector(event)) {
        startBoxSelection({
          stop: "manual",
          type: "append",
          withShiftKey: "invert",
        })
        keyEventRegistrar.activate()
      }
    },
    // key up
    (event: KeyboardEvent) => {
      if (!isBoxSelectionEnabled.value) return
      if (configs.view.selection.detector(event)) {
        if (states.pointers.size === 0) {
          stopBoxSelection()
        } else {
          states.options.stopTrigger = "pointerup"
        }
        keyEventRegistrar.deactivate()
      }
    }
  )

  watch(isBoxSelectionEnabled, value => {
    if (value) {
      keyEventRegistrar.register()
    } else {
      keyEventRegistrar.unregister()
    }
  })

  // ------------------------------------------------------------------
  // Lifecycle process
  // ------------------------------------------------------------------

  onMounted(() => {
    viewport.value = container.value?.querySelector(".v-viewport") as SVGGElement
    if (isBoxSelectionEnabled.value) {
      keyEventRegistrar.register()
    }
  })

  onUnmounted(() => {
    stopBoxSelection()
    if (isBoxSelectionEnabled.value) {
      keyEventRegistrar.unregister()
    }
  })

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
    pointerEventHandler.register()
  }

  function stopBoxSelection() {
    if (modes.viewMode.value !== "box-selection") return
    modes.viewMode.value = "default"
    pointerEventHandler.unregister()
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
  nodeStates: Readonly<NodeStates>,
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
    selectedNodes.forEach(nodeId => {
      if (!enclosedNodes.has(nodeId)) {
        selectedNodes.delete(nodeId)
      }
    })
    enclosedNodes.forEach(nodeId => {
      const selectable = nodeStates[nodeId]?.selectable ?? false
      if (
        selectable === true ||
        (typeof selectable === "number" && selectedNodes.size < selectable)
      ) {
        selectedNodes.add(nodeId)
      }
    })
  } else {
    // selectionType === "invert"
    const temporary = new Set<string>(selectedNodesAtSelectStarted)
    temporary.forEach(nodeId => {
      if (enclosedNodes.has(nodeId)) {
        temporary.delete(nodeId)
      }
    })
    enclosedNodes.forEach(nodeId => {
      if (!selectedNodesAtSelectStarted.has(nodeId)) {
        const selectable = nodeStates[nodeId]?.selectable ?? false
        if (
          selectable === true ||
          (typeof selectable === "number" && temporary.size < selectable)
        ) {
          temporary.add(nodeId)
        }
      }
    })
    // replace
    selectedNodes.clear()
    temporary.forEach(nodeId => selectedNodes.add(nodeId))
  }
}

// ------------------------------------------------------------------
// Event register/unregister
// ------------------------------------------------------------------

type KeyboardEventHandler = (event: KeyboardEvent) => void
type PointerEventHandler = (event: PointerEvent) => void
type MouseEventHandler = (event: MouseEvent) => void

class PointerEventRegistrar {
  _container: Ref<SVGElement | undefined>
  _handlePointerDownEvent: PointerEventHandler
  _handlePointerUpEvent: PointerEventHandler
  _handlePointerMoveEvent: PointerEventHandler
  _handleClickEvent: MouseEventHandler
  _handleKeyDownEvent: KeyboardEventHandler
  _ignoreEvent: PointerEventHandler

  constructor(
    container: Ref<SVGElement | undefined>,
    handlePointerDownEvent: PointerEventHandler,
    handlePointerUpEvent: PointerEventHandler,
    handlePointerMoveEvent: PointerEventHandler,
    handleClickEvent: MouseEventHandler,
    handleKeyDownEvent: KeyboardEventHandler
  ) {
    this._container = container
    this._handlePointerDownEvent = handlePointerDownEvent
    this._handlePointerUpEvent = handlePointerUpEvent
    this._handlePointerMoveEvent = handlePointerMoveEvent
    this._handleClickEvent = handleClickEvent
    this._handleKeyDownEvent = handleKeyDownEvent
    this._ignoreEvent = (event: PointerEvent) => event.stopPropagation()
  }

  register() {
    const options = { capture: true, passive: false }
    const container = nonNull(this._container.value, "container")
    container.addEventListener("pointerdown", this._handlePointerDownEvent, options)
    container.addEventListener("click", this._handleClickEvent, options)
    container.addEventListener("pointerenter", this._ignoreEvent, options)
    container.addEventListener("pointerleave", this._ignoreEvent, options)
    document.addEventListener("keydown", this._handleKeyDownEvent, options)
  }

  activate() {
    const options = { capture: true, passive: false }
    document.addEventListener("pointermove", this._handlePointerMoveEvent, options)
    document.addEventListener("pointerup", this._handlePointerUpEvent, options)
  }

  deactivate() {
    const options = { capture: true }
    document.removeEventListener("pointermove", this._handlePointerMoveEvent, options)
    document.removeEventListener("pointerup", this._handlePointerUpEvent, options)
  }

  unregister() {
    this.deactivate()
    const options = { capture: true }
    if (this._container.value) {
      const container = this._container.value
      container.removeEventListener("pointerdown", this._handlePointerDownEvent, options)
      container.removeEventListener("click", this._handleClickEvent, options)
      container.removeEventListener("pointerenter", this._ignoreEvent, options)
      container.removeEventListener("pointerleave", this._ignoreEvent, options)
      document.removeEventListener("keydown", this._handleKeyDownEvent, options)
    }
  }
}

class KeyEventRegistrar {
  _container: Ref<SVGElement | undefined>
  _handleKeyDownEvent: KeyboardEventHandler
  _handleKeyUpEvent: KeyboardEventHandler
  _preventDefault: MouseEventHandler

  constructor(
    container: Ref<SVGElement | undefined>,
    handleKeyDownEvent: KeyboardEventHandler,
    handleKeyUpEvent: KeyboardEventHandler
  ) {
    this._container = container
    this._handleKeyDownEvent = handleKeyDownEvent
    this._handleKeyUpEvent = handleKeyUpEvent
    this._preventDefault = (event: MouseEvent) => {
      event.stopPropagation()
      event.preventDefault()
    }
  }

  register() {
    document.addEventListener("keydown", this._handleKeyDownEvent, { capture: true, passive: true })
  }

  activate() {
    document.addEventListener("keyup", this._handleKeyUpEvent, { capture: true, passive: true })
    const container = nonNull(this._container.value, "container")
    container.addEventListener("contextmenu", this._preventDefault, { passive: false })
  }

  deactivate() {
    document.removeEventListener("keyup", this._handleKeyUpEvent, { capture: true })
    if (this._container.value) {
      const container = this._container.value
      container.removeEventListener("contextmenu", this._preventDefault)
    }
  }

  unregister() {
    this.deactivate()
    document.removeEventListener("keydown", this._handleKeyDownEvent, { capture: true })
  }
}
