import { describe, expect, it, vi } from "vitest"
import { nextTick, reactive } from "vue"
import { bindProp } from "./props"

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
  })
})
