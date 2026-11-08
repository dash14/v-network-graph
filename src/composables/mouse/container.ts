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
  isShiftClickOnOtherKind,
} from "./core"

export function setupContainerInteractionHandlers(
  container: Ref<SVGElement | undefined>,
  modes: InteractionModes,
  isSvgWheelZoomEnabled: Ref<boolean>,
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

  function removePointerHandlers() {
    entriesOf(containerPointerHandlers).forEach(([ev, handler]) => {
      document.removeEventListener(ev, handler)
    })
  }

  function handleContainerPointerDownEvent(event: PointerEvent) {
    // Windows fires contextmenu after the release, too late to cancel the click.
    if (event.button == 2 /* right button */) return
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
    if (state.pointerCounter <= 0) {
      state.pointerCounter = 0
      removePointerHandlers()
      const threshold = getPointerMoveDetectionThreshold(event.pointerType)
      if (state.moveCounter <= threshold) {
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

    if (state.pointerCounter > 0) {
      // reset pointer down state
      state.pointerCounter = 0
      removePointerHandlers()
    }
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
