import { Emitter } from "mitt"
import { onMounted, onUnmounted, Ref, watch } from "vue"
import { nonNull } from "@/common/common"
import { Events } from "@/common/types"
import { entriesOf } from "@/utils/object"
import {
  ClickState,
  createClickEvents,
  getPointerMoveDetectionThreshold,
  InteractionModes,
  isPrimaryButton,
  isShiftClickOnOtherKind,
} from "./core"

export function setupContainerInteractionHandlers(
  container: Ref<SVGElement | undefined>,
  modes: InteractionModes,
  isSvgWheelZoomEnabled: Ref<boolean>,
  emitter: Emitter<Events>
) {
  const state = {
    // The pointers whose press is counted, with the type and the number of moves of each
    pressedPointers: new Map<number, { type: string; moves: number }>(),
    isClickable: true, // false once a pointer of the press is cancelled or released after a drag
    clickState: undefined as ClickState | undefined,
  }

  // Count the moves of each pressed pointer, to tell a click from a drag when it is released.
  const containerPointerHandlers = {
    pointermove: handleContainerPointerMoveEvent,
    pointerup: handleContainerPointerUpEvent,
    pointercancel: handleContainerPointerCancelEvent,
  }

  function removePointerHandlers() {
    entriesOf(containerPointerHandlers).forEach(([ev, handler]) => {
      document.removeEventListener(ev, handler)
    })
  }

  function handleContainerPointerDownEvent(event: PointerEvent) {
    if (!isPrimaryButton(event)) return
    if (event.isPrimary) {
      // A primary pointer is the only one of its type down, so the others were released unseen,
      // over an iframe or while the window lost focus.
      for (const [pointerId, { type }] of state.pressedPointers) {
        if (type === event.pointerType) state.pressedPointers.delete(pointerId)
      }
    }
    if (state.pressedPointers.size === 0) {
      state.isClickable = true
      // Add to event listener
      entriesOf(containerPointerHandlers).forEach(([ev, handler]) => {
        document.addEventListener(ev, handler, { passive: true })
      })
    }
    state.pressedPointers.set(event.pointerId, { type: event.pointerType, moves: 0 })
  }

  function handleContainerPointerMoveEvent(event: PointerEvent) {
    const pressed = state.pressedPointers.get(event.pointerId)
    if (!pressed) return
    if (["mouse", "pen"].includes(event.pointerType) && event.buttons === 0) {
      // A mouse or pen moving with no button down was released where the document did not hear it.
      endPress(event.pointerId)
      return
    }
    pressed.moves++
  }

  function handleContainerPointerCancelEvent(event: PointerEvent) {
    if (!state.pressedPointers.has(event.pointerId)) return
    // A press the browser takes over, for a scroll or a pinch, is no tap.
    state.isClickable = false
    endPress(event.pointerId)
  }

  /** Forgets a pointer of the press, and returns whether it was the last one. */
  function endPress(pointerId: number) {
    state.pressedPointers.delete(pointerId)
    if (state.pressedPointers.size > 0) return false
    removePointerHandlers()
    return true
  }

  function handleContainerPointerUpEvent(event: PointerEvent) {
    // Ends a counted press whichever of its chorded buttons is released last.
    const pressed = state.pressedPointers.get(event.pointerId)
    if (!pressed) return
    if (pressed.moves > getPointerMoveDetectionThreshold(pressed.type)) {
      state.isClickable = false
    }
    if (endPress(event.pointerId)) {
      // Windows fires contextmenu after the right button's release, too late to cancel the click.
      if (state.isClickable && event.button != 2 /* right button */) {
        // Click container (without mouse move)
        if (isShiftClickOnOtherKind(modes, "container", event)) return
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
    emitter.emit("view:click", { event })
  }

  function handleContainerDoubleClickEvent(event: MouseEvent) {
    if (event.isTrusted) return // native event
    event.stopPropagation()
    emitter.emit("view:dblclick", { event })
  }

  function handleContainerContextMenuEvent(event: MouseEvent) {
    emitter.emit("view:contextmenu", { event })

    // reset pointer down state
    state.pressedPointers.clear()
    removePointerHandlers()
  }

  const preventDefault = (e: MouseEvent) => {
    e.preventDefault()
  }

  onMounted(() => {
    const c = nonNull(container.value, "container")
    c.addEventListener("pointerdown", handleContainerPointerDownEvent, { passive: true })
    c.addEventListener("click", handleContainerClickEvent, { passive: false })
    c.addEventListener("dblclick", handleContainerDoubleClickEvent, { passive: false })
    c.addEventListener("contextmenu", handleContainerContextMenuEvent, { passive: false })
    if (isSvgWheelZoomEnabled.value) {
      c.addEventListener("wheel", preventDefault, { passive: false })
    }
  })

  // The <svg> and its listeners are gone by now, but not those on the document for a pressed pointer.
  onUnmounted(removePointerHandlers)

  watch(isSvgWheelZoomEnabled, enabled => {
    const c = nonNull(container.value, "container")
    if (enabled) {
      c.addEventListener("wheel", preventDefault, { passive: false })
    } else {
      c.removeEventListener("wheel", preventDefault)
    }
  })
}
