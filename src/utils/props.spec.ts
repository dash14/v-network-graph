import { describe, expect, it, vi } from "vitest"
import { nextTick, reactive, ref } from "vue"
import { bindProp, bindPropKeySet } from "./props"

const clamp = (v: number) => Math.min(Math.max(v, 1), 10)

describe("props", () => {
  describe("bindProp", () => {
    it("should emit the filtered value at once when the prop is out of range", () => {
      const props = reactive({ zoom: 20 })
      const emit = vi.fn()
      const bound = bindProp(props, "zoom", emit, clamp)
      expect(bound.value).toBe(10)
      expect(emit).toHaveBeenCalledWith("update:zoom", 10)
    })

    it("should follow the prop and emit only what the filter changed", async () => {
      const props = reactive({ zoom: 5 })
      const emit = vi.fn()
      const bound = bindProp(props, "zoom", emit, clamp)
      expect(emit).not.toHaveBeenCalled()

      props.zoom = 7
      await nextTick()
      expect(bound.value).toBe(7)
      expect(emit).not.toHaveBeenCalled()

      props.zoom = 0
      await nextTick()
      expect(bound.value).toBe(1)
      expect(emit).toHaveBeenCalledWith("update:zoom", 1)
    })

    it("should emit the value set on the ref", async () => {
      const props = reactive({ zoom: 5 })
      const emit = vi.fn()
      const bound = bindProp(props, "zoom", emit, clamp)

      bound.value = 3
      await nextTick()
      expect(emit).toHaveBeenCalledWith("update:zoom", 3)

      emit.mockClear()
      bound.value = 30
      await nextTick()
      expect(bound.value).toBe(10)
      expect(emit).toHaveBeenCalledWith("update:zoom", 10)
    })

    it("should keep the value when the prop changes to an equal one", async () => {
      const props = reactive({ ids: ["a"] })
      const bound = bindProp(props, "ids", vi.fn(), v => [...v])
      const before = bound.value
      props.ids = ["a"]
      await nextTick()
      expect(bound.value).toBe(before)
    })
  })

  describe("bindPropKeySet", () => {
    const source = ref({ a: {}, b: {} })

    it("should take the keys in the source from the prop at once", () => {
      const props = reactive({ selected: ["a", "unknown"] })
      const bound = bindPropKeySet(props, "selected", source, vi.fn())
      expect(Array.from(bound)).toEqual(["a"])
    })

    it("should follow the prop changed in place, without emitting it back", async () => {
      const props = reactive({ selected: ["a"] })
      const emit = vi.fn()
      const bound = bindPropKeySet(props, "selected", source, emit)
      props.selected.push("b")
      await nextTick()
      expect(Array.from(bound)).toEqual(["a", "b"])
      expect(emit).not.toHaveBeenCalled()
    })

    it("should emit the keys added to the set", async () => {
      const props = reactive({ selected: ["a"] })
      const emit = vi.fn()
      const bound = bindPropKeySet(props, "selected", source, emit)
      bound.add("b")
      await nextTick()
      expect(emit).toHaveBeenCalledWith("update:selected", ["a", "b"])
    })
  })
})
