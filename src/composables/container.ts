import type { InjectionKey, Ref } from "vue"
import { provide, inject } from "vue"
import { SvgPanZoomInstance } from "@/modules/svg-pan-zoom-ex"
import { nonNull } from "@/common/common"

interface ProvideContainers {
  container: Ref<HTMLDivElement>
  svg: Ref<SVGElement>
  viewport: Ref<SVGGElement>
  svgPanZoom: Ref<SvgPanZoomInstance | undefined>
}

interface Containers {
  container: Ref<HTMLDivElement | undefined>
  svg: Ref<SVGElement | undefined>
  viewport: Ref<SVGGElement | undefined>
  svgPanZoom: Ref<SvgPanZoomInstance | undefined>
}

const containersKey = Symbol("containers") as InjectionKey<Containers>

export function provideContainers(containers: Containers): void {
  provide(containersKey, containers)
}

export function useContainers(): ProvideContainers {
  const containers = nonNull(inject(containersKey), "containers")
  return {
    container: containers.container as Ref<HTMLDivElement>,
    svg: containers.svg as Ref<SVGElement>,
    viewport: containers.viewport as Ref<SVGGElement>,
    svgPanZoom: containers.svgPanZoom
  }
}
