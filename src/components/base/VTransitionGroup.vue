<script setup lang="ts">
// TransitionGroup updates and measures every child whenever it renders, so use it only when animating.
defineProps<{ name?: string }>()
</script>

<template>
  <transition-group v-if="name" :name="name" tag="g">
    <slot />
  </transition-group>
  <g v-else>
    <slot />
  </g>
</template>
