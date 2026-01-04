import type { InjectionKey, Ref } from "vue"
import { provide, inject, computed } from "vue"
import { nonNull } from "@/common/common"
import { ViewConfig } from "@/common/configs"

interface ZoomProvides {
  zoomLevel: Ref<number>,
  scale: Ref<number>
}

const zoomLevelKey = Symbol("zoomLevel") as InjectionKey<ZoomProvides>

export function provideZoomLevel(zoomLevel: Ref<number>, viewStyle: ViewConfig) {
  const scale = computed(() => {
    return viewStyle.scalingObjects ? 1 : (1 / zoomLevel.value)
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
