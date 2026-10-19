<script setup lang="ts">
defineProps<{ name?: string }>()
</script>

<template>
  <!-- TransitionGroup updates and measures every child whenever it renders, so use it only when animating. -->
  <transition-group v-if="name" :name="name" tag="g">
    <slot />
  </transition-group>
  <g v-else>
    <slot />
  </g>
</template>
