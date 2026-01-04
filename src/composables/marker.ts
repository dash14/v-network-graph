import { reactive } from "vue"
import { MarkerStyle } from "@/common/configs"
import { convertToAscii } from "@/utils/string"

export type MarkerBuilder = (marker: MarkerStyle | null, isSource?: boolean) => string

export interface HeadMarker extends MarkerStyle {
  color: string
  isSource: boolean
}

export interface MarkerState {
  markers: Record<string, HeadMarker>
  referenceCount: Record<string, number>
}

export function makeMarkerState(): MarkerState {
  const markers: Record<string, HeadMarker> = reactive({})
  const referenceCount: Record<string, number> = {}
  return { markers, referenceCount }
}

export interface UseMarkerReturn {
  makeMarker: (
    marker: MarkerStyle,
    isSource: boolean,
    previousId: string | undefined,
    strokeColor: string,
    instanceId: number
  ) => string | undefined
  clearMarker: (id: string | undefined) => void
}

export function useMarker(markerState: MarkerState): UseMarkerReturn {
  const { markers, referenceCount } = markerState

  function addMarker(key: string, marker: HeadMarker) {
    const m = referenceCount[key] ?? 0
    referenceCount[key] = m + 1
    if (!m) {
      markers[key] = marker
    }
  }

  function removeMarker(key: string) {
    const m = referenceCount[key] ?? 0
    if (m) {
      if (m - 1 === 0) {
        delete markers[key]
        delete referenceCount[key]
      } else {
        referenceCount[key] = m - 1
      }
    }
  }

  function clearMarker(id: string | undefined) {
    if (id) {
      removeMarker(id)
    }
  }

  function makeMarker(
    marker: MarkerStyle,
    isSource: boolean,
    previousId: string | undefined,
    strokeColor: string,
    instanceId: number
  ) {
    if (marker.type === "none") {
      clearMarker(previousId)
      return undefined
    }

    if (marker.type === "custom") {
      clearMarker(previousId)
      return marker.customId
    }

    const headMarker = toHeadMarker(marker, isSource, strokeColor)
    const id = buildKey(headMarker, instanceId)
    if (id === previousId) {
      return id
    }
    clearMarker(previousId)
    addMarker(id, headMarker)
    return id
  }

  return {
    makeMarker,
    clearMarker,
  }
}

function toHeadMarker(marker: MarkerStyle, isSource: boolean, strokeColor: string) {
  return {
    ...marker,
    color: marker.color ?? strokeColor,
    isSource,
  }
}

function buildKey(m: HeadMarker, instanceId: number) {
  // If the same marker ID exists in the previous instance and is hidden by
  // `display: none`, the marker in the other instance will disappear.
  // For safety, marker IDs will be unique in the entire page.
  const c = convertToAscii(m.color)
  const d = m.isSource ? "L" : "R"
  const u = m.units === "strokeWidth" ? "rel" : "abs"
  return `marker_${instanceId}_${m.type}_${m.width}_${m.height}_${m.margin}_${m.offset}_${c}_${d}_${u}`
}
