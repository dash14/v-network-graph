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

export function useMarker(markerState: MarkerState) {
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
    strokeColor: string
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
    const id = buildKey(headMarker)
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

function buildKey(m: HeadMarker) {
  const converted = convertToAscii(m.color)
  return `marker_${m.type}_${m.width}_${m.height}_${m.margin}_${converted}_${
    m.isSource ? "L" : "R"
  }_${m.units === "strokeWidth" ? "rel" : "abs"}`
}
