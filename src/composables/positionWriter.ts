import type { Ref } from "vue"
import { inject, InjectionKey, onScopeDispose, provide, watchEffect } from "vue"
import { nonNull } from "@/common/common"
import { Position } from "@/common/types"
import type { PositionDrawer } from "@/layouts/handler"
import { EdgeGeometry, edgePathOf } from "@/modules/edge/geometry"
import type { UpdatableCurrentPositions } from "./currentPositions"
import type { DrawEdge } from "./edgePlacement"

type ElementRef = (el: unknown) => void

// What was last written to an element, so that the same position is not written again. A node
// has its position in x1 and y1, and a self-loop its path in d.
interface Written {
  x1: number
  y1: number
  x2: number
  y2: number
  d?: string
  // The lengths of a line, taken once: each stays the same object, reflecting its attribute.
  lengths?: [SVGLength, SVGLength, SVGLength, SVGLength]
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
}

const injectionKey = Symbol("positionWriter") as InjectionKey<PositionWriter>

// Long enough to span the frames between the ticks of a layout.
const MOVING_TIMEOUT = 200

// The least move in screen pixels drawn ahead of the layouts, which write every move once they
// catch up. Late in a layout, most nodes move less than this on each tick.
const MIN_MOVE_AHEAD = 0.2

// Positions change on every layout tick, so write them to the DOM directly instead of re-rendering each object.
export function providePositionWriter(
  currentPositions: UpdatableCurrentPositions,
  edgeGeometries: ReadonlyMap<string, EdgeGeometry>,
  changes: PositionChanges,
  viewport: Ref<Element | undefined>
) {
  const nodeElements = new Map<string, Map<Element, Written>>()
  const edgeElements = new Map<string, Map<Element, Written>>()

  // Read untracked: the changes say what to write.
  // Drawn ahead as numbers where the browser has them, which skips formatting and parsing a string.
  // The attributes then read back with fewer digits, and keep them when the layouts catch up with
  // the same position, so the other writes stay strings to keep every digit where they can.
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
    writeNodeAt(el, written, currentPositions.of(id))
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
      const lengths = (written.lengths ??= [
        line.x1.baseVal,
        line.y1.baseVal,
        line.x2.baseVal,
        line.y2.baseVal,
      ])
      lengths[0].value = p1.x
      lengths[1].value = p1.y
      lengths[2].value = p2.x
      lengths[3].value = p2.y
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
      const d = edgePathOf(geometry)
      if (written.d === d) return
      written.d = d
      el.setAttribute("d", d)
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
    zoomLevel: () => number,
    placeEdgesAhead: (draw: DrawEdge) => void
  ): PositionDrawer => {
    // Where each node is drawn ahead, kept while it moves less than the least move from there, so
    // that a node moving a little on each tick is drawn once the moves add up. Its edges and
    // everything else read the same position. Dropped as the layouts move the node and draw it.
    let drawnAhead = new Map<string, Position>()
    let minMove = 0
    const isNear = (p: Position, drawn: Position | undefined): drawn is Position =>
      !!drawn && Math.abs(p.x - drawn.x) < minMove && Math.abs(p.y - drawn.y) < minMove
    currentPositions.onMoved(ids => ids.forEach(id => drawnAhead.delete(id)))
    return {
      get interval() {
        return interval()
      },
      draw: positionOf => {
        markMoving()
        minMove = MIN_MOVE_AHEAD / zoomLevel()
        // Made again on each draw, so that it leaves out the nodes removed.
        const previous = drawnAhead
        drawnAhead = new Map()
        nodeElements.forEach((_, id) => {
          const p = positionOf(id)
          if (!p) return
          const drawn = previous.get(id)
          drawnAhead.set(id, isNear(p, drawn) ? drawn : p)
        })
        // Through the layout's function, which has no position once the layouts catch up, and
        // which has a node moved since the draw, as by a drag, where it is now.
        currentPositions.drawAhead(id => {
          const p = positionOf(id)
          if (!p) return undefined
          const drawn = drawnAhead.get(id)
          return isNear(p, drawn) ? drawn : p
        })
        nodeElements.forEach((elements, id) => {
          const p = currentPositions.of(id)
          elements.forEach((w, el) => writeNodeAt(el, w, p, true))
        })
        placeEdgesAhead((id, p1, p2) =>
          edgeElements.get(id)?.forEach((w, el) => {
            if (el.localName === "line") writeLineAt(el, w, p1, p2, true)
            else writeEdge(el, w, id)
          })
        )
      },
      setFlush: f => {
        flush = f
        // Without a layout drawing ahead, the layouts have the positions.
        if (!f) {
          currentPositions.endAhead()
          drawnAhead.clear()
        }
      },
    }
  }

  provide(injectionKey, {
    nodeRef: id => elementRef(nodeElements, id, writeNode),
    edgeRef: id => elementRef(edgeElements, id, writeEdge),
  })

  // Updates the layouts to tell the user, which the graph does not need.
  const flushPositions = () => flush?.()

  return { makePositionDrawer, flushPositions }
}

export function usePositionWriter() {
  return nonNull(inject(injectionKey), "PositionWriter")
}
