<script setup lang="ts">
import { StrokeStyle } from "@/common/configs"
import { useStrokeAttributes } from "@/composables/svg"

interface Props {
  d: string
  config: StrokeStyle
  scale?: number
}

const props = withDefaults(defineProps<Props>(), {
  scale: 1.0
})

const attrs = useStrokeAttributes(props)
</script>

<template>
  <path class="v-ng-path" :d="d" v-bind="attrs" />
</template>

<style lang="scss">
.v-ng-path.animate {
  --animation-speed: 100;
  animation: v-ng-path-dash 10s linear infinite;
  stroke-dashoffset: var(--animation-speed);
}
@keyframes v-ng-path-dash {
  to {
    stroke-dashoffset: 0;
  }
}
</style>
