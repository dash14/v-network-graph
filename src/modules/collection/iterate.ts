
export function pairwise<T>(arr: T[], func: (p1: T, p2: T) => void) {
  for (let i = 0; i < arr.length - 1; i++) {
    func(arr[i], arr[i + 1])
  }
}
