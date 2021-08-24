import { HeadStyle } from "src/common/configs"
import { InjectionKey, onUnmounted, provide, reactive } from "vue"

export type MarkerBuilder = (marker: HeadStyle | null, isSource?: boolean) => string

export interface HeadMarker extends HeadStyle {
  isSource: boolean
}

// MEMO
// - state計算時にarrowとmarginも計算
// - lineの長さを計算
// - arrow typeを追加


const markers: Record<string, HeadMarker> = reactive({})
const referenceCount: Record<string, number> = {}

const markersKey = Symbol("markers") as InjectionKey<typeof markers>

export function provideMarkers() {
  provide(markersKey, markers)
  return markers
}

function buildKey(m: HeadStyle, isSource: boolean) {
  return `marker_${m.type}_${m.width}_${m.height}_${m.color.replace("#", "")}_${isSource ? "L" : "R"}_${m.relative ? "R" : "A"}`
}

function addMarker(key: string, marker: HeadStyle, isSource: boolean) {
  const m = referenceCount[key] ?? 0
  referenceCount[key] = m + 1
  if (!m) {
    markers[key] = { ...marker, isSource }
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

export function clearMarker(id: string | undefined) {
  if (id) {
    removeMarker(id)
  }
}

export function makeMarker(marker: HeadStyle, isSource: boolean, previousId: string | undefined) {
  if (marker.type === "none") {
    clearMarker(previousId)
    return undefined
  }

  const id = buildKey(marker, isSource)
  console.log("build", id)
  if (id === previousId) {
    console.log("same", id)
    return id
  }
  clearMarker(previousId)
  addMarker(id, marker, isSource)
  return id
}

export function useMarkers() {
  const keys: string[] = []

  function makeBuilder() {
    let latestKey: string | null = null

    const cancel = () => {
      if (!latestKey) return
      console.log("cancel", latestKey)
      const i = keys.indexOf("latestKey")
      if (i >= 0) keys.splice(i, 1)
      removeMarker(latestKey)
      latestKey = null
    }

    const build = (marker: HeadStyle | null, isSource?: boolean) => {
      if (!marker || marker.type === "none") {
        cancel()
        return ""
      }
      const key = buildKey(marker, !!isSource)
      console.log("build", key)
      if (key === latestKey) {
        console.log("same", latestKey)
        return key
      }
      cancel()
      addMarker(key, marker, !!isSource)
      latestKey = key
      keys.push(key)
      return key
    }

    return build
  }

  onUnmounted(() => keys.forEach(removeMarker))
  return makeBuilder
}
