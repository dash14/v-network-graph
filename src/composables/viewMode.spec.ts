import mitt from "mitt"
import { describe, expect, it, vi } from "vitest"
import { ref } from "vue"
import { getFullConfigs } from "@/common/config-defaults"
import type { Events } from "@/common/types"
import type { SvgPanZoomInstance } from "@/modules/svg-pan-zoom-ex"
import { useViewMode } from "./viewMode"

function setup(view: { panEnabled?: boolean; zoomEnabled?: boolean } = {}, draggable = true) {
  const configs = getFullConfigs({ view, node: { draggable } })
  const instance = {
    enablePan: vi.fn(),
    disablePan: vi.fn(),
    enableZoom: vi.fn(),
    disableZoom: vi.fn(),
  }
  const svgPanZoom = ref(instance as unknown as SvgPanZoomInstance)
  const emitter = mitt<Events>()
  return { ...useViewMode(svgPanZoom, configs, emitter), instance, svgPanZoom, emitter }
}

describe("useViewMode", () => {
  it("should tell while a node is dragged", () => {
    const { dragging, emitter } = setup()
    expect(dragging.value).toBe(false)
    emitter.emit("node:dragstart", {})
    expect(dragging.value).toBe(true)
    emitter.emit("node:dragend", {})
    expect(dragging.value).toBe(false)
  })

  it("should stop the pan and the zoom outside the default mode, and resume them in it", () => {
    const { instance, emitter } = setup()
    emitter.emit("view:mode", "box-selection")
    expect(instance.disablePan).toHaveBeenCalledOnce()
    expect(instance.disableZoom).toHaveBeenCalledOnce()
    expect(instance.enablePan).not.toHaveBeenCalled()
    expect(instance.enableZoom).not.toHaveBeenCalled()

    emitter.emit("view:mode", "default")
    expect(instance.enablePan).toHaveBeenCalledOnce()
    expect(instance.enableZoom).toHaveBeenCalledOnce()
  })

  it("should leave the pan and the zoom switched off in the configs as they are", () => {
    const { instance, emitter } = setup({ panEnabled: false, zoomEnabled: false })
    emitter.emit("view:mode", "box-selection")
    emitter.emit("view:mode", "default")
    expect(Object.values(instance).every(f => f.mock.calls.length === 0)).toBe(true)
  })

  it("should switch nothing before svg-pan-zoom is there", () => {
    const { svgPanZoom, emitter } = setup()
    svgPanZoom.value = undefined as unknown as SvgPanZoomInstance
    expect(() => emitter.emit("view:mode", "default")).not.toThrow()
    expect(() => emitter.emit("view:mode", "box-selection")).not.toThrow()
  })

  it.each([
    [{ panEnabled: false, zoomEnabled: false }, false, false],
    [{ panEnabled: true, zoomEnabled: false }, false, true],
    [{ panEnabled: false, zoomEnabled: true }, false, true],
    [{ panEnabled: false, zoomEnabled: false }, true, true],
  ])("should handle touches with %o and draggable nodes %s: %s", (view, draggable, expected) => {
    expect(setup(view, draggable).touches.value).toBe(expected)
  })
})
