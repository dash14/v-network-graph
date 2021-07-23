import { nonNull } from "../common/types"
import { ViewConfig } from "../common/configs"
import { provide, inject, InjectionKey, Ref, computed } from "vue"

interface ZoomProvides {
  zoomLevel: Ref<number>,
  scale: Ref<number>
}

const zoomLevelKey = Symbol("zoomLevel") as InjectionKey<ZoomProvides>

export function provideZoomLevel(zoomLevel: Ref<number>, viewStyle: ViewConfig) {
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
