import { nonNull } from "@/common/types"
import { ViewStyle } from "@/common/styles"
import { provide, inject, InjectionKey, Ref, computed } from "@vue/runtime-core"

interface ZoomProvides {
  zoomLevel: Ref<number>,
  scale: Ref<number>
}

const zoomLevelKey = Symbol("zoomLevel") as InjectionKey<ZoomProvides>

export function provideZoomLevel(zoomLevel: Ref<number>, viewStyle: ViewStyle) {
  const scale = computed(() => {
    return viewStyle.resizeWithZooming ? 1 : zoomLevel.value
  })
  provide(zoomLevelKey, {
    zoomLevel,
    scale
  })
  return { scale }
}

export function useZoomLevel(): ZoomProvides {
  return nonNull(inject(zoomLevelKey), "zoomLevel")
}
