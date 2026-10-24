import { inject, InjectionKey, provide, toRaw, watchEffect } from "vue"
import { nonNull, Reactive } from "@/common/common"
import { Layouts } from "@/common/types"
import { PositionChanges } from "@/composables/state"
import { quadraticCurveCommands } from "@/modules/calculation/path"
import { EdgeGeometry } from "@/modules/edge/geometry"
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
    if (geometry) el.setAttribute("d", edgePath(geometry))
  }

  // Before the renders, since the edge overlays read the paths from the DOM while they render.
  watchEffect(
    () => {
      void changes.changed.value
      changes.nodes.forEach(id => nodeElements.get(id)?.forEach(el => writeNode(el, id)))
      changes.edges.forEach(id => edgeElements.get(id)?.forEach(el => writeEdge(el, id)))
      changes.nodes.clear()
      changes.edges.clear()
    },
    { flush: "pre" }
  )

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

function edgePath(geometry: EdgeGeometry) {
  const p = geometry.position
  if (geometry.loop) {
    const { radius, isLargeArc, isClockwise } = geometry.loop
    const [rx, ry] = radius
    const f1 = isLargeArc ? 1 : 0
    const f2 = isClockwise ? 1 : 0
    return `M ${p.p1.x} ${p.p1.y} A ${rx} ${ry} 0 ${f1} ${f2} ${p.p2.x} ${p.p2.y}`
  } else if (geometry.curve) {
    const points = [...geometry.curve.control, { x: p.p2.x, y: p.p2.y }]
    return [`M ${p.p1.x} ${p.p1.y}`, ...quadraticCurveCommands(points)].join(" ")
  } else {
    return `M ${p.p1.x} ${p.p1.y} L ${p.p2.x} ${p.p2.y}`
  }
}

export function usePositionWriter() {
  return nonNull(inject(injectionKey), "PositionWriter")
}
