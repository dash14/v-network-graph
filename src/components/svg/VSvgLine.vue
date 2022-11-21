<script setup lang="ts">
import { computed } from "vue"
import { StrokeStyle } from "@/common/configs"
import { Position } from "@/common/types"
import { applyMargin } from "@/modules/calculation/line"
import VSvgPath from "./VSvgPath.vue"

interface Props {
  source: Position
  target: Position
  config: StrokeStyle
  sourceMargin?: number
  targetMargin?: number
  scale?: number
}

const props = withDefaults(defineProps<Props>(), {
  sourceMargin: 0,
  targetMargin: 0,
  scale: 0,
})

const d = computed(() => {
  let source = props.source
  let target = props.target
  if (props.sourceMargin !== 0 || props.targetMargin !== 0) {
    const pos = applyMargin(
      { p1: source, p2: target },
      props.sourceMargin * props.scale,
      props.targetMargin * props.scale
    )
    source = pos.p1
    target = pos.p2
  }
  return `M ${source.x} ${source.y} L ${target.x} ${target.y}`
})
</script>

<template>
  <VSvgPath :d="d" :config="config" :scale="scale" />
</template>
