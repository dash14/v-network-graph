import { onMounted, onUnmounted, Ref } from "vue"
import { Emitter } from "mitt"
import { Reactive } from "@/common/common"
import { Events } from "@/common/types"
import { entriesOf } from "@/utils/object"
import { InteractionState, MOVE_DETECTION_THRESHOLD } from "./core"

export function setupContainerInteractionHandlers(
  container: Ref<SVGSVGElement | undefined>,
  state: InteractionState,
  selectedNodes: Reactive<Set<string>>,
  selectedEdges: Reactive<Set<string>>,
  emitter: Emitter<Events>
) {
  const containerPointerHandlers = {
    pointermove: handleContainerPointerMoveEvent,
    pointerup: handleContainerPointerUpEvent,
    pointercancel: handleContainerPointerUpEvent,
  }

  function handleContainerPointerDownEvent(_: PointerEvent) {
    state.container.allowClickEvent = false
    state.container.moveCounter = 0
    if (state.container.pointerCounter === 0) {
      // Add to event listener
      entriesOf(containerPointerHandlers).forEach(([ev, handler]) => {
        container.value?.addEventListener(ev, handler, { passive: true })
      })
    }
    state.container.pointerCounter++
  }

  function handleContainerPointerMoveEvent(_: PointerEvent) {
    state.container.moveCounter++
  }

  function handleContainerPointerUpEvent(event: PointerEvent) {
    state.container.pointerCounter--
    if (state.container.pointerCounter === 0) {
      // Remove from event listener
      entriesOf(containerPointerHandlers).forEach(([ev, handler]) => {
        container.value?.removeEventListener(ev, handler)
      })
      if (state.container.moveCounter <= MOVE_DETECTION_THRESHOLD) {
        // Click container (without mouse move)
        if (event.shiftKey && (selectedNodes.size > 0 || selectedEdges.size > 0)) {
          return
        }
        selectedNodes.clear()
        selectedEdges.clear()
        state.container.allowClickEvent = true
      }
    }
  }

  function handleContainerClickEvent(event: MouseEvent) {
    if (state.container.allowClickEvent) {
      emitter.emit("view:click", { event })
    }
  }

  function handleContainerDoubleClickEvent(event: MouseEvent) {
    if (state.container.allowClickEvent) {
      emitter.emit("view:dblclick", { event })
    }
  }

  function handleContainerContextMenuEvent(event: MouseEvent) {
    emitter.emit("view:contextmenu", { event })

    if (state.container.pointerCounter > 0) {
      // reset pointer down state
      state.container.pointerCounter = 0
      // Remove from event listener
      entriesOf(containerPointerHandlers).forEach(([ev, handler]) => {
        container.value?.removeEventListener(ev, handler)
      })
    }
  }

  onMounted(() => {
    const c = container.value
    if (!c) return
    c.addEventListener("pointerdown", handleContainerPointerDownEvent, { passive: true })
    c.addEventListener("click", handleContainerClickEvent, { passive: false })
    c.addEventListener("dblclick", handleContainerDoubleClickEvent, { passive: false })
    c.addEventListener("contextmenu", handleContainerContextMenuEvent, { passive: false })
  })

  onUnmounted(() => {
    container.value?.removeEventListener("pointerdown", handleContainerPointerDownEvent)
    container.value?.removeEventListener("click", handleContainerClickEvent)
    container.value?.removeEventListener("dblclick", handleContainerDoubleClickEvent)
    container.value?.removeEventListener("contextmenu", handleContainerContextMenuEvent)
  })
}
