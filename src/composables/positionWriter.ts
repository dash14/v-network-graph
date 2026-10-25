import type { Ref } from "vue"
import { inject, InjectionKey, onScopeDispose, provide, toRaw, watchEffect } from "vue"
import { nonNull, Reactive } from "@/common/common"
import { Layouts, Position } from "@/common/types"
import type { PositionDrawer } from "@/layouts/handler"
import { EdgeGeometry, edgePathOf } from "@/modules/edge/geometry"
import { untrackedPositionOf } from "@/modules/node/position"

type ElementRef = (el: unknown) => void
type PositionOf = (node: string) => Position | undefined

/** The nodes and edges whose positions changed since the last time they were taken. */
export interface PositionChanges {
  nodes: Set<string>
  edges: Set<string>
  /** Triggered when ids are added. */
  changed: Ref<void>
}

interface PositionWriter {
  nodeRef(id: string): ElementRef
  edgeRef(id: string): ElementRef
  /** Bring the layouts up to the positions drawn, before reading them. */
  flushPositions(): void
}

const injectionKey = Symbol("positionWriter") as InjectionKey<PositionWriter>

// Long enough to span the frames between the ticks of a layout.
const MOVING_TIMEOUT = 200

// Positions change on every layout tick, so write them to the DOM directly instead of re-rendering each object.
export function providePositionWriter(
  layouts: Reactive<Layouts>,
  edgeGeometries: ReadonlyMap<string, EdgeGeometry>,
  changes: PositionChanges,
  viewport: Ref<Element | undefined>
) {
  const nodeElements = new Map<string, Set<Element>>()
  const edgeElements = new Map<string, Set<Element>>()

  // Read untracked: the changes say what to write.
  const writeNodeAt = (el: Element, p: Position) => {
    el.setAttribute("transform", `translate(${p.x} ${p.y})`)
  }
  const writeNode = (el: Element, id: string) => {
    writeNodeAt(el, untrackedPositionOf(toRaw(layouts).nodes, id))
  }
  const writeEdge = (el: Element, id: string) => {
    const geometry = edgeGeometries.get(id)
    if (!geometry) return
    // By the tag name, as the element classes may be missing outside a browser, as in jsdom.
    if (el.localName === "line") {
      const { p1, p2 } = geometry.position
      el.setAttribute("x1", `${p1.x}`)
      el.setAttribute("y1", `${p1.y}`)
      el.setAttribute("x2", `${p2.x}`)
      el.setAttribute("y2", `${p2.y}`)
    } else {
      el.setAttribute("d", edgePathOf(geometry))
    }
  }

  // Marked while the positions keep changing over frames, as in a layout, a drag or a zoom, so that
  // styles making each change costlier can be left out. Not for a single change, which would restyle
  // every edge twice for nothing. Written directly, so that the graph does not re-render for it.
  let lastFrame: CSSNumberish | null | undefined
  let lastWriteAt = 0
  let movingTimer: ReturnType<typeof setTimeout> | undefined
  const setMoving = (moving: boolean) => viewport.value?.toggleAttribute("data-moving", moving)
  const waitForStop = (delay: number) => {
    movingTimer = setTimeout(() => {
      const idle = performance.now() - lastWriteAt
      if (idle < MOVING_TIMEOUT) return waitForStop(MOVING_TIMEOUT - idle)
      movingTimer = undefined
      setMoving(false)
    }, delay)
  }
  const markMoving = () => {
    // A single change can be written over several flushes, all in the same frame.
    const frame = document.timeline.currentTime
    if (frame === lastFrame) return
    lastFrame = frame
    lastWriteAt = performance.now()
    if (movingTimer === undefined) waitForStop(MOVING_TIMEOUT)
    else setMoving(true)
  }
  onScopeDispose(() => clearTimeout(movingTimer))

  watchEffect(() => {
    void changes.changed.value
    if (changes.nodes.size > 0 || changes.edges.size > 0) markMoving()
    changes.nodes.forEach(id => nodeElements.get(id)?.forEach(el => writeNode(el, id)))
    changes.edges.forEach(id => edgeElements.get(id)?.forEach(el => writeEdge(el, id)))
    changes.nodes.clear()
    changes.edges.clear()
  })

  // Ref callbacks can run inside a render, so they must not read or write anything reactive.
  const elementRef = (
    elements: Map<string, Set<Element>>,
    id: string,
    write: (el: Element, id: string) => void
  ): ElementRef => {
    let current: Element | undefined
    return el => {
      const next = el instanceof Element ? el : undefined
      // Called on every render of the object, not only when its element changes.
      if (next === current) return
      if (current) {
        const set = elements.get(id)
        set?.delete(current)
        if (set?.size === 0) elements.delete(id)
      }
      current = next
      if (!current) return
      let set = elements.get(id)
      if (!set) elements.set(id, (set = new Set()))
      set.add(current)
      write(current, id)
    }
  }

  // Drawn ahead of the layouts, every object at once, since a layout tick moves every node.
  let flush: (() => void) | undefined
  const makePositionDrawer = (
    interval: () => number,
    placeEdgesAt: (positionOf: PositionOf) => void
  ): PositionDrawer => ({
    get interval() {
      return interval()
    },
    draw: positionOf => {
      markMoving()
      const positions = toRaw(layouts).nodes
      nodeElements.forEach((elements, id) => {
        const p = positionOf(id) ?? untrackedPositionOf(positions, id)
        elements.forEach(el => writeNodeAt(el, p))
      })
      placeEdgesAt(positionOf)
      edgeElements.forEach((elements, id) => elements.forEach(el => writeEdge(el, id)))
    },
    setFlush: f => (flush = f),
  })

  provide(injectionKey, {
    nodeRef: id => elementRef(nodeElements, id, writeNode),
    edgeRef: id => elementRef(edgeElements, id, writeEdge),
    flushPositions: () => flush?.(),
  })

  return { makePositionDrawer }
}

export function usePositionWriter() {
  return nonNull(inject(injectionKey), "PositionWriter")
}
