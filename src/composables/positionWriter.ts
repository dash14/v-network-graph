import { inject, InjectionKey, provide, toRaw, watchEffect } from "vue"
import { nonNull, Reactive } from "@/common/common"
import { Layouts } from "@/common/types"
import { PositionChanges } from "@/composables/state"
import { EdgeGeometry, edgePathOf } from "@/modules/edge/geometry"
import { untrackedPositionOf } from "@/modules/node/position"

type ElementRef = (el: unknown) => void

interface PositionWriter {
  nodeRef(id: string): ElementRef
  edgeRef(id: string): ElementRef
}

const injectionKey = Symbol("positionWriter") as InjectionKey<PositionWriter>

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

  watchEffect(() => {
    void changes.changed.value
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
}

export function usePositionWriter() {
  return nonNull(inject(injectionKey), "PositionWriter")
}
