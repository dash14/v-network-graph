import { useId as vueUseId } from "vue"

/**
 * Generate unique ID in v-network-graph instances.
 * Uses Vue 3.5's built-in useId for SSR compatibility.
 */
export function useId(): string {
  return vueUseId()
}
