import { onMounted, onUnmounted, Ref } from "vue"
import { Emitter } from "mitt"
import { Events } from "@/common/types"
import { entriesOf } from "@/utils/object"
import { InteractionModes, MOVE_DETECTION_THRESHOLD } from "./core"

export function setupContainerInteractionHandlers(
  container: Ref<SVGSVGElement | undefined>,
  modes: InteractionModes,
  emitter: Emitter<Events>
) {
  const state = {
    moveCounter: 0,
    pointerCounter: 0,
    allowClickEvent: false,
  }

  // measure the number of move events in the pointerdown state
  // and use it to determine the click when pointerup.
  const containerPointerHandlers = {
    pointermove: handleContainerPointerMoveEvent,
    pointerup: handleContainerPointerUpEvent,
    pointercancel: handleContainerPointerUpEvent,
  }

  function handleContainerPointerDownEvent(_: PointerEvent) {
    state.allowClickEvent = false
    state.moveCounter = 0
    if (state.pointerCounter === 0) {
      // Add to event listener
      entriesOf(containerPointerHandlers).forEach(([ev, handler]) => {
        container.value?.addEventListener(ev, handler, { passive: true })
      })
    }
    state.pointerCounter++
  }

  function handleContainerPointerMoveEvent(_: PointerEvent) {
    state.moveCounter++
  }

  function handleContainerPointerUpEvent(event: PointerEvent) {
    state.pointerCounter--
    if (state.pointerCounter === 0) {
      // Remove from event listener
      entriesOf(containerPointerHandlers).forEach(([ev, handler]) => {
        container.value?.removeEventListener(ev, handler)
      })
      if (state.moveCounter <= MOVE_DETECTION_THRESHOLD) {
        // Click container (without mouse move)
        if (event.shiftKey && modes.selectionMode.value !== "container") {
          return
        }
        modes.selectionMode.value = "container"
        state.allowClickEvent = true
      }
    }
  }

  function handleContainerClickEvent(event: MouseEvent) {
    if (state.allowClickEvent) {
      emitter.emit("view:click", { event })
    }
  }

  function handleContainerDoubleClickEvent(event: MouseEvent) {
    if (state.allowClickEvent) {
      emitter.emit("view:dblclick", { event })
    }
  }

  function handleContainerContextMenuEvent(event: MouseEvent) {
    emitter.emit("view:contextmenu", { event })

    if (state.pointerCounter > 0) {
      // reset pointer down state
      state.pointerCounter = 0
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
