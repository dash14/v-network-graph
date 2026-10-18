import { commands } from "vitest/browser"

const ATTRIBUTE_VALUE = /="([^"]*)"/g
const NUMBER = /-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi

/**
 * Replace each number in the attribute values of `actual` with the
 * number at the same position in `expected` when the two are within
 * `tolerance`, so that comparing the result with `expected` ignores
 * differences in the last digits.
 */
export function alignNumbers(actual: string, expected: string, tolerance = 1e-6): string {
  const expectedNumbers = Array.from(expected.matchAll(ATTRIBUTE_VALUE)).flatMap(([, value]) =>
    Array.from(value.matchAll(NUMBER), ([n]) => n)
  )
  let index = 0
  return actual.replace(ATTRIBUTE_VALUE, (_, value: string) => {
    const aligned = value.replace(NUMBER, n => {
      const e = expectedNumbers[index++]
      return e !== undefined && Math.abs(Number(n) - Number(e)) <= tolerance ? e : n
    })
    return `="${aligned}"`
  })
}

/**
 * Align the numbers of `actual` with the file snapshot at `path`,
 * relative to the project root, if the snapshot exists.
 */
export async function alignWithSnapshot(actual: string, path: string): Promise<string> {
  let expected: string
  try {
    expected = await commands.readFile(path)
  } catch {
    return actual
  }
  return alignNumbers(actual, expected)
}
