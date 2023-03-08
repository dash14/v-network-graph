export function xor(a: boolean, b: boolean): boolean {
  return (a || b) && !(a && b)
}
