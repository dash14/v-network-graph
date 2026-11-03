import { describe, expect, it } from "vitest"
import type { MarkerStyle } from "@/common/configs"
import { makeMarkerState, useMarker } from "./marker"

const arrow: MarkerStyle = {
  type: "arrow",
  width: 4,
  height: 4,
  margin: -1,
  offset: 0,
  units: "strokeWidth",
  color: null,
}

describe("useMarker", () => {
  const setup = () => {
    const state = makeMarkerState()
    const { makeMarker, clearMarker } = useMarker(state)
    const make = (marker: MarkerStyle, previousId?: string) =>
      makeMarker(marker, false, previousId, "#ff0000", "1")
    return { state, make, clearMarker }
  }

  it("should keep a marker shared by edges until every edge clears it", () => {
    const { state, make, clearMarker } = setup()
    const id = make(arrow)!
    expect(make(arrow)).toBe(id)
    expect(state.referenceCount[id]).toBe(2)

    clearMarker(id)
    expect(state.referenceCount[id]).toBe(1)
    expect(state.markers[id]).toBeDefined()
    clearMarker(id)
    expect(state.markers).toEqual({})
    expect(state.referenceCount).toEqual({})
  })

  it("should leave the count of a marker that is not there as it is", () => {
    const { state, clearMarker } = setup()
    clearMarker("unknown")
    expect(state.referenceCount).toEqual({})
  })

  it.each([
    ["another marker", { ...arrow, width: 8 }],
    ["no marker", { ...arrow, type: "none" as const }],
    ["a custom marker", { ...arrow, type: "custom" as const, customId: "my-marker" }],
  ])("should clear the previous marker when changed to %s", (_, next) => {
    const { state, make } = setup()
    const id = make(arrow)!
    make(next, id)
    expect(state.markers[id]).toBeUndefined()
  })
})
