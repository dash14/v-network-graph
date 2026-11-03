import { afterEach, describe, expect, it, vi } from "vitest"
import { nextTick, ref } from "vue"
import type { InputPaths, Path } from "@/common/types"
import { useTranslatePathsToObject } from "./object"

describe("useTranslatePathsToObject", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  const path = (...edges: string[]): Path => ({ edges })

  it("should take paths given as an object as they are", () => {
    const paths = { path1: path("edge1") }
    const { objects, isInCompatibilityModeForPath } = useTranslatePathsToObject(ref(paths))
    expect(objects.value).toEqual(paths)
    expect(isInCompatibilityModeForPath.value).toBe(false)
  })

  it("should key the paths given as an array by their ids", () => {
    const { objects } = useTranslatePathsToObject(ref([{ id: "a", edges: ["edge1"] }]))
    expect(Object.keys(objects.value)).toEqual(["a"])
  })

  it("should give each path without an id one, keeping it while the path is given", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const p1 = path("edge1")
    const p2 = path("edge2")
    const input = ref<InputPaths>([p1, p2])
    const { objects, isInCompatibilityModeForPath } = useTranslatePathsToObject(input)
    expect(objects.value).toEqual({ "path-1": p1, "path-2": p2 })
    expect(isInCompatibilityModeForPath.value).toBe(true)

    input.value = [p2, p1]
    await nextTick()
    expect(objects.value).toEqual({ "path-2": p2, "path-1": p1 })

    expect(warn).toHaveBeenCalledOnce()
    expect(warn).toHaveBeenCalledWith(
      "[v-network-graph] Please specify the `id` field for the `Path` object." +
        " Currently, this works for compatibility," +
        " but in the future, the id field will be required."
    )
  })

  it("should give a path given again after it was removed a new id", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {})
    const p1 = path("edge1")
    const p2 = path("edge2")
    const input = ref<InputPaths>([p1, p2])
    const { objects } = useTranslatePathsToObject(input)

    input.value = [p2]
    await nextTick()
    input.value = [p2, p1]
    await nextTick()
    expect(objects.value).toEqual({ "path-2": p2, "path-3": p1 })
  })
})
