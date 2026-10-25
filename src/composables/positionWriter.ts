import type { Ref } from "vue"
import { inject, InjectionKey, onScopeDispose, provide, shallowRef, toRaw, watchEffect } from "vue"
import { nonNull, Reactive } from "@/common/common"
import { Layouts } from "@/common/types"
import { EdgeGeometry, edgePathOf } from "@/modules/edge/geometry"
import { untrackedPositionOf } from "@/modules/node/position"

type ElementRef = (el: unknown) => void

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

// Positions change on every layout tick, so write them to the DOM directly instead of re-rendering each object.
export function providePositionWriter(
  layouts: Reactive<Layouts>,
  edgeGeometries: ReadonlyMap<string, EdgeGeometry>,
  changes: PositionChanges
) {
  const nodeElements = new Map<string, Set<Element>>()
  const edgeElements = new Map<string, Set<Element>>()

  // Read untracked: the changes say what to write.
  const writeNode = (el: Element, id: string) => {
    const p = untrackedPositionOf(toRaw(layouts).nodes, id)
    el.setAttribute("transform", `translate(${p.x} ${p.y})`)
  }
  const writeEdge = (el: Element, id: string) => {
    const geometry = edgeGeometries.get(id)
    if (geometry) el.setAttribute("d", edgePathOf(geometry))
  }

  // Set while the positions keep changing, as in a layout, a drag or a zoom, so that styles making
  // each change costlier can be left out. Not for a single change, which would restyle every edge
  // twice for nothing.
  const moving = shallowRef(false)
  let movingTimer: ReturnType<typeof setTimeout> | undefined
  // A single change can be written over several flushes of the same task.
  let writtenInTask = false
  const markMoving = () => {
    if (writtenInTask) return
    writtenInTask = true
    setTimeout(() => (writtenInTask = false))
    if (movingTimer !== undefined) moving.value = true
    clearTimeout(movingTimer)
    movingTimer = setTimeout(() => {
      moving.value = false
      movingTimer = undefined
    }, MOVING_TIMEOUT)
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

  provide(injectionKey, {
    nodeRef: id => elementRef(nodeElements, id, writeNode),
    edgeRef: id => elementRef(edgeElements, id, writeEdge),
  })

  return { moving }
}

export function usePositionWriter() {
  return nonNull(inject(injectionKey), "PositionWriter")
}
