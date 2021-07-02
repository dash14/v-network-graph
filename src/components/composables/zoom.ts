import { nonNull, ViewStyle } from "@/common/types"
import { provide, inject, InjectionKey, Ref, computed } from "@vue/runtime-core"

interface ZoomProvides {
  zoomLevel: Ref<number>,
  scale: Ref<number>
}

const zoomLevelKey = Symbol("zoomLevel") as InjectionKey<ZoomProvides>

export function provideZoomLevel(zoomLevel: Ref<number>, viewStyle: ViewStyle) {
  // event bus
  provide(zoomLevelKey, {
    zoomLevel,
    scale: computed(() => {
      return viewStyle.resizeWithZooming ? 1 : zoomLevel.value
    })
  })
}

export function useZoomLevel(): ZoomProvides {
  return nonNull(inject(zoomLevelKey))
}
