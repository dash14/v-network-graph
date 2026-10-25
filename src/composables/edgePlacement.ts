// Where the edges are drawn

import { isEqual } from "lodash-es"
import type { ComputedRef, ReactiveEffectRunner, Ref, ShallowRef } from "vue"
import { computed, effect, shallowRef, stop, toRef, triggerRef, watchEffect } from "vue"
import { Reactive } from "@/common/common"
import { Config, EdgeConfig, ShapeStyle } from "@/common/configs"
import { Edges, Position } from "@/common/types"
import * as EdgeModel from "@/models/edge"
import * as NodeModel from "@/models/node"
import { calculateEdgeGeometry, EdgeGeometry, EdgeGeometryInput } from "@/modules/edge/geometry"
import type { PositionChanges } from "./positionWriter"

/** Draws an edge between the given ends. */
export type DrawEdge = (edge: string, p1: Position, p2: Position) => void

type EdgePlacementStyle = Omit<EdgeGeometryInput, "source" | "target" | "scale"> & {
  sourceId: string
  targetId: string
}

const GEOMETRY_KEYS = ["origin", "labelPosition", "position", "curve", "loop"] as const

function initialEdgeGeometry(): EdgeGeometry {
  return {
    origin: { p1: { x: 0, y: 0 }, p2: { x: 0, y: 0 } },
    labelPosition: { p1: { x: 0, y: 0 }, p2: { x: 0, y: 0 } },
    position: { p1: { x: 0, y: 0 }, p2: { x: 0, y: 0 } },
    curve: undefined,
    loop: undefined,
  }
}

// Colors do not change where an edge is drawn, so they are left out of what is compared.
function withoutColors(shape: ShapeStyle): ShapeStyle {
  return { ...shape, color: "", strokeColor: undefined, strokeDasharray: undefined }
}

/** The parts of the geometry of an edge, each replaced as the edge is placed. */
export type EdgeGeometryRefs = { [K in keyof EdgeGeometry]: ShallowRef<EdgeGeometry[K]> }

export interface EdgePlacement {
  /** The geometry of each placed edge, to read without tracking. */
  geometries: ReadonlyMap<string, EdgeGeometry>
  /** Re-place the given edges, as their nodes moved. */
  placeEdges: (ids: Set<string>) => void
  /**
   * Place every edge where its nodes are now, ahead of the layouts, and pass the ends to draw.
   * Neither the refs nor, for an edge between the node centers, the geometries are updated until
   * the layouts follow.
   */
  placeEdgesAhead: (draw: DrawEdge) => void
  /** Start re-placing the edges whose style changed, after the edges are created. */
  followStyleChanges: () => void
  /**
   * Start placing an edge.
   * @returns the geometry of the edge, and the function to stop placing it
   */
  startPlacing: (
    id: string,
    line: ComputedRef<EdgeModel.Line>
  ) => { geometry: EdgeGeometryRefs; stop: () => void }
}

export function makeEdgePlacement(
  edges: Ref<Edges>,
  config: EdgeConfig,
  nodeStates: NodeModel.NodeStates,
  edgeGroupStates: Reactive<EdgeModel.EdgeGroupStates>,
  positionOf: (node: string) => Position,
  scale: Ref<number>,
  changes: PositionChanges
): EdgePlacement {
  const placers = new Map<string, ReactiveEffectRunner>()
  const placersAhead = new Map<string, (draw: DrawEdge) => void>()
  const geometries = new Map<string, EdgeGeometry>()
  const dirtyEdges = new Set<string>()
  const edgesDirty = shallowRef(0)

  const placeEdges = (ids: Set<string>, onlyIfDirty = false) => {
    let placed = false
    ids.forEach(id => {
      const place = placers.get(id)
      if (!place || (onlyIfDirty && !place.effect.dirty)) return
      place()
      changes.edges.add(id)
      placed = true
    })
    if (placed) triggerRef(changes.changed)
  }

  // Re-place the edges whose own dependencies changed, together in one pass.
  const followStyleChanges = () => {
    watchEffect(() => {
      void edgesDirty.value
      if (dirtyEdges.size === 0) return
      // Taken out first, so that an edge scheduled again while placing stays for the next pass.
      const ids = new Set(dirtyEdges)
      dirtyEdges.clear()
      // A computed dependency notifies without knowing whether its value changed.
      placeEdges(ids, true)
    })
  }

  const startPlacing = (id: string, line: ComputedRef<EdgeModel.Line>) => {
    // One ref for each part, so that a straight edge staying straight does not notify the readers
    // of its curve and loop.
    const initial = initialEdgeGeometry()
    geometries.set(id, initial)
    const geometry = Object.fromEntries(
      GEOMETRY_KEYS.map(key => [key, shallowRef(initial[key])])
    ) as EdgeGeometryRefs

    const edgeLayoutPoint: Ref<EdgeModel.EdgeLayoutPoint | undefined> = toRef(
      edgeGroupStates.edgeLayoutPoints,
      id
    )
    const isEdgeSummarized: Ref<true | undefined> = toRef(edgeGroupStates.summarizedEdges, id)

    // Copied out of the reactive objects so that placing reads none. The positions and the scale
    // are left out, since a layout tick or a zoom changes them for every edge.
    const style = computed<EdgePlacementStyle | undefined>(previous => {
      const next = placementStyle()
      // Kept when equal, so that a change of the stroke alone does not re-place the edge.
      return previous && isEqual(previous, next) ? previous : next
    })
    const placementStyle = (): EdgePlacementStyle | undefined => {
      const edge = edges.value[id]
      if (!edge) return undefined

      const sourceShape = nodeStates[edge.source]?.staticShape
      const targetShape = nodeStates[edge.target]?.staticShape
      if (!sourceShape || !targetShape) {
        return undefined
      }

      const layoutPoint = edgeLayoutPoint.value
      const l = line.value
      const selfLoop =
        edge.source === edge.target ? Config.values(config.selfLoop, edge) : undefined
      return {
        sourceId: edge.source,
        targetId: edge.target,
        sourceShape: withoutColors(sourceShape),
        targetShape: withoutColors(targetShape),
        // Only the ends of the user's edge, which may carry any data.
        layoutPoint: layoutPoint && {
          ...layoutPoint,
          edge: { source: layoutPoint.edge.source, target: layoutPoint.edge.target },
        },
        summarized: isEdgeSummarized.value ?? false,
        line: {
          normalWidth: l.normalWidth,
          source: { ...l.source, color: null },
          target: { ...l.target, color: null },
        },
        // A self-loop is drawn the same with any type, so it does not track it.
        type: selfLoop ? "straight" : config.type,
        margin: config.margin,
        keepOrder: config.keepOrder,
        selfLoop: selfLoop && { ...selfLoop },
      }
    }

    // Made by the effect, so that placing ahead of the layouts tracks nothing. Only the positions
    // change from one placing to the next.
    let input: (EdgePlacementStyle & EdgeGeometryInput) | undefined
    let betweenCenters = false
    const currentGeometry = (): EdgeGeometry | undefined => {
      if (!input) return undefined
      input.source = positionOf(input.sourceId)
      input.target = positionOf(input.targetId)
      return calculateEdgeGeometry(input)
    }

    // Tracks the style and the scale: the tracking of the positions re-places the edges of moved
    // nodes.
    const placeEdge = () => {
      const s = style.value
      input = s && { ...s, source: { x: 0, y: 0 }, target: { x: 0, y: 0 }, scale: scale.value }
      // With no marker, no margin and no other edge beside it, the edge runs between the centers.
      betweenCenters =
        !!s &&
        !!s.layoutPoint &&
        s.layoutPoint.groupWidth === 0 &&
        !s.margin &&
        s.line.source.type === "none" &&
        s.line.target.type === "none"
      const placed = currentGeometry()
      if (!placed) return
      geometries.set(id, placed)
      geometry.origin.value = placed.origin
      geometry.labelPosition.value = placed.labelPosition
      geometry.position.value = placed.position
      geometry.curve.value = placed.curve
      geometry.loop.value = placed.loop
    }
    const place = effect(placeEdge, {
      scheduler: () => {
        dirtyEdges.add(id)
        triggerRef(edgesDirty)
      },
    })
    placers.set(id, place)
    // Only the position is drawn ahead of the layouts, so an edge between the node centers is
    // drawn from them, with no geometry worked out.
    placersAhead.set(id, draw => {
      if (!input) return
      if (betweenCenters) {
        draw(id, positionOf(input.sourceId), positionOf(input.targetId))
        return
      }
      const placed = currentGeometry()
      if (!placed) return
      geometries.set(id, placed)
      draw(id, placed.position.p1, placed.position.p2)
    })

    const stopPlacing = () => {
      placers.delete(id)
      placersAhead.delete(id)
      geometries.delete(id)
      stop(place)
    }
    return { geometry, stop: stopPlacing }
  }

  const placeEdgesAhead = (draw: DrawEdge) => {
    placersAhead.forEach(place => place(draw))
  }

  return {
    geometries,
    placeEdges: ids => placeEdges(ids),
    placeEdgesAhead,
    followStyleChanges,
    startPlacing,
  }
}
