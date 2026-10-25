import type { Ref } from "vue"
import { inject, InjectionKey, onScopeDispose, provide, toRaw, watchEffect } from "vue"
import { nonNull, Reactive } from "@/common/common"
import { Layouts, Position } from "@/common/types"
import type { PositionDrawer } from "@/layouts/handler"
import { EdgeGeometry, edgePathOf } from "@/modules/edge/geometry"
import { untrackedPositionOf } from "@/modules/node/position"

type ElementRef = (el: unknown) => void
type PositionOf = (node: string) => Position | undefined
type DrawEdge = (edge: string, p1: Position, p2: Position) => void

// What was last written to an element, so that the same position is not written again. A node
// has its position in x1 and y1.
interface Written {
  x1: number
  y1: number
  x2: number
  y2: number
}

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
  const nodeElements = new Map<string, Map<Element, Written>>()
  const edgeElements = new Map<string, Map<Element, Written>>()

  // Read untracked: the changes say what to write.
  // Drawn ahead as numbers where the browser has them, which skips formatting and parsing a string.
  // Not otherwise, as the attributes then read back with fewer digits.
  const writeNodeAt = (el: Element, written: Written, p: Position, asNumbers = false) => {
    if (written.x1 === p.x && written.y1 === p.y) return
    written.x1 = p.x
    written.y1 = p.y
    const transforms = asNumbers
      ? (el as Partial<SVGGraphicsElement>).transform?.baseVal
      : undefined
    if (transforms?.numberOfItems === 1) {
      transforms.getItem(0).setTranslate(p.x, p.y)
    } else {
      el.setAttribute("transform", `translate(${p.x} ${p.y})`)
    }
  }
  const writeNode = (el: Element, written: Written, id: string) => {
    writeNodeAt(el, written, untrackedPositionOf(toRaw(layouts).nodes, id))
  }
  const writeLineAt = (
    el: Element,
    written: Written,
    p1: Position,
    p2: Position,
    asNumbers = false
  ) => {
    if (written.x1 === p1.x && written.y1 === p1.y && written.x2 === p2.x && written.y2 === p2.y) {
      return
    }
    written.x1 = p1.x
    written.y1 = p1.y
    written.x2 = p2.x
    written.y2 = p2.y
    const line = el as Partial<SVGLineElement>
    if (asNumbers && line.x1 && line.y1 && line.x2 && line.y2) {
      line.x1.baseVal.value = p1.x
      line.y1.baseVal.value = p1.y
      line.x2.baseVal.value = p2.x
      line.y2.baseVal.value = p2.y
    } else {
      el.setAttribute("x1", `${p1.x}`)
      el.setAttribute("y1", `${p1.y}`)
      el.setAttribute("x2", `${p2.x}`)
      el.setAttribute("y2", `${p2.y}`)
    }
  }
  const writeEdge = (el: Element, written: Written, id: string) => {
    const geometry = edgeGeometries.get(id)
    if (!geometry) return
    // By the tag name, as the element classes may be missing outside a browser, as in jsdom.
    if (el.localName === "line") {
      writeLineAt(el, written, geometry.position.p1, geometry.position.p2)
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
    changes.nodes.forEach(id => nodeElements.get(id)?.forEach((w, el) => writeNode(el, w, id)))
    changes.edges.forEach(id => edgeElements.get(id)?.forEach((w, el) => writeEdge(el, w, id)))
    changes.nodes.clear()
    changes.edges.clear()
  })

  // Ref callbacks can run inside a render, so they must not read or write anything reactive.
  const elementRef = (
    elements: Map<string, Map<Element, Written>>,
    id: string,
    write: (el: Element, written: Written, id: string) => void
  ): ElementRef => {
    let current: Element | undefined
    return el => {
      const next = el instanceof Element ? el : undefined
      // Called on every render of the object, not only when its element changes.
      if (next === current) return
      if (current) {
        const byElement = elements.get(id)
        byElement?.delete(current)
        if (byElement?.size === 0) elements.delete(id)
      }
      current = next
      if (!current) return
      let byElement = elements.get(id)
      if (!byElement) elements.set(id, (byElement = new Map()))
      const written = { x1: NaN, y1: NaN, x2: NaN, y2: NaN }
      byElement.set(current, written)
      write(current, written, id)
    }
  }

  // Drawn ahead of the layouts, every object at once, since a layout tick moves every node.
  let flush: (() => void) | undefined
  const makePositionDrawer = (
    interval: () => number,
    placeEdgesAt: (positionOf: PositionOf, draw: DrawEdge) => void
  ): PositionDrawer => ({
    get interval() {
      return interval()
    },
    draw: positionOf => {
      markMoving()
      const positions = toRaw(layouts).nodes
      nodeElements.forEach((elements, id) => {
        const p = positionOf(id) ?? untrackedPositionOf(positions, id)
        elements.forEach((w, el) => writeNodeAt(el, w, p, true))
      })
      placeEdgesAt(positionOf, (id, p1, p2) =>
        edgeElements.get(id)?.forEach((w, el) => {
          if (el.localName === "line") writeLineAt(el, w, p1, p2, true)
          else writeEdge(el, w, id)
        })
      )
    },
    setFlush: f => (flush = f),
  })

  const flushPositions = () => flush?.()

  provide(injectionKey, {
    nodeRef: id => elementRef(nodeElements, id, writeNode),
    edgeRef: id => elementRef(edgeElements, id, writeEdge),
    flushPositions,
  })

  return { makePositionDrawer, flushPositions }
}

export function usePositionWriter() {
  return nonNull(inject(injectionKey), "PositionWriter")
}
