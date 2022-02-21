
type Args<T> = [...(T | null)[], T]

export function findFirstNonNull<T>(...values: Args<T>): T {
  return values.find(v => !!v) as T
}
