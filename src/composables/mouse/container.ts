import { onMounted, onUnmounted, Ref } from "vue"
import { Emitter } from "mitt"
import { Events } from "@/common/types"
import { entriesOf } from "@/utils/object"
import {
  ClickState,
  createClickEvents,
  getPointerMoveDetectionThreshold,
  InteractionModes,
} from "./core"

export function setupContainerInteractionHandlers(
  container: Ref<SVGElement | undefined>,
  modes: InteractionModes,
  emitter: Emitter<Events>
) {
  const state = {
    moveCounter: 0,
    pointerCounter: 0,
    clickState: undefined as ClickState | undefined,
  }

  // measure the number of move events in the pointerdown state
  // and use it to determine the click when pointerup.
  const containerPointerHandlers = {
    pointermove: handleContainerPointerMoveEvent,
    pointerup: handleContainerPointerUpEvent,
    pointercancel: handleContainerPointerUpEvent,
  }

  function handleContainerPointerDownEvent(_: PointerEvent) {
    state.moveCounter = 0
    if (state.pointerCounter === 0) {
      // Add to event listener
      entriesOf(containerPointerHandlers).forEach(([ev, handler]) => {
        document.addEventListener(ev, handler, { passive: true })
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
        document.removeEventListener(ev, handler)
      })
      const threshold = getPointerMoveDetectionThreshold(event.pointerType)
      if (state.moveCounter <= threshold) {
        // Click container (without mouse move)
        if (event.shiftKey && modes.selectionMode.value !== "container") {
          return
        }
        modes.selectionMode.value = "container"

        // click handling
        const [clickState, clickEvent, doubleClickEvent] = createClickEvents(
          state.clickState,
          event,
          "view"
        )
        state.clickState = clickState
        container.value!.dispatchEvent(clickEvent)
        if (doubleClickEvent) {
          container.value!.dispatchEvent(doubleClickEvent)
        }
      }
    }
  }

  function handleContainerClickEvent(event: MouseEvent) {
    if (event.isTrusted) return // native event
    // When a finger is placed on any object and another object is tapped,
    // no click event is fired. Thus, click events are emulated by using
    // pointerdown/up. The following is processing for emulated events only.
    event.stopPropagation()
    event.preventDefault()
    emitter.emit("view:click", { event })
  }

  function handleContainerDoubleClickEvent(event: MouseEvent) {
    if (event.isTrusted) return // native event
    event.stopPropagation()
    event.preventDefault()
    emitter.emit("view:dblclick", { event })
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
    const c = container.value
    if (!c) return
    c.removeEventListener("pointerdown", handleContainerPointerDownEvent)
    c.removeEventListener("click", handleContainerClickEvent)
    c.removeEventListener("dblclick", handleContainerDoubleClickEvent)
    c.removeEventListener("contextmenu", handleContainerContextMenuEvent)
  })
}
