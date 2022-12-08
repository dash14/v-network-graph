<script setup lang="ts">
import { StrokeStyle } from "@/common/configs"
import { applyScaleToDasharray, getAnimationSpeed } from "@/utils/visual"

interface Props {
  d: string
  config: StrokeStyle
  scale?: number
}

withDefaults(defineProps<Props>(), {
  scale: 1.0,
})
</script>

<template>
  <path
    :d="d"
    class="v-ng-svg-path"
    :class="{ animate: config.animate }"
    :stroke="config.color"
    :stroke-width="config.width * scale"
    :stroke-dasharray="applyScaleToDasharray(config.dasharray, scale)"
    :stroke-linecap="config.linecap"
    :style="getAnimationSpeed('--animation-speed', config, scale)"
    fill="none"
  />
</template>

<style lang="scss">
.v-ng-svg-path.animate {
  --animation-speed: 100;
  animation: v-ng-svg-path-dash 10s linear infinite;
  stroke-dashoffset: var(--animation-speed);
}
@keyframes v-ng-svg-path-dash {
  to {
    stroke-dashoffset: 0;
  }
}
</style>
