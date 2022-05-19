let nextId = 1

/** Generate unique ID in v-network-graph instances */
export function useId(): number {
  return nextId++
}
