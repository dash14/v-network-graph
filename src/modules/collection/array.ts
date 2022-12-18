
export function removeItem<T extends number | string>(arr: T[], value: T): void {
  const i = arr.indexOf(value)
  if (i >= 0) arr.splice(i, 1)
}

export function insertAfter<T extends number | string>(arr: T[], base: T, value: T): void {
  const i = arr.indexOf(base)
  if (i < 0) return
  arr.splice(i + 1, 0, value)
}
