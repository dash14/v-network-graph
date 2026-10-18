import { commands } from "vitest/browser"

const NUMERIC_ATTRIBUTES = new Set([
  "cx",
  "cy",
  "d",
  "dx",
  "dy",
  "font-size",
  "height",
  "markerHeight",
  "markerWidth",
  "points",
  "r",
  "refX",
  "refY",
  "rx",
  "ry",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-width",
  "transform",
  "viewBox",
  "width",
  "x",
  "x1",
  "x2",
  "y",
  "y1",
  "y2",
])
const ATTRIBUTE = /( ([\w:-]+)=")([^"]*)"/g
const NUMBER = /-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi

interface Line {
  /** The line with the numbers of numeric attributes masked, to pair lines with. */
  shape: string
  numbers: string[]
}

function parseLine(line: string): Line {
  const numbers: string[] = []
  const shape = line.replace(ATTRIBUTE, (match, head: string, name: string, value: string) => {
    if (!NUMERIC_ATTRIBUTES.has(name)) return match
    return `${head}${value.replace(NUMBER, n => (numbers.push(n), "#"))}"`
  })
  return { shape, numbers }
}

/** Pair lines with equal shapes, keeping their order. */
function pairLines(actual: Line[], expected: Line[]): Map<number, number> {
  const rows = actual.length
  const cols = expected.length
  const lengths = Array.from({ length: rows + 1 }, () => new Uint32Array(cols + 1))
  for (let i = rows - 1; i >= 0; i--) {
    for (let j = cols - 1; j >= 0; j--) {
      lengths[i][j] =
        actual[i].shape === expected[j].shape
          ? lengths[i + 1][j + 1] + 1
          : Math.max(lengths[i + 1][j], lengths[i][j + 1])
    }
  }
  const pairs = new Map<number, number>()
  for (let i = 0, j = 0; i < rows && j < cols;) {
    if (actual[i].shape === expected[j].shape) {
      pairs.set(i++, j++)
    } else if (lengths[i + 1][j] >= lengths[i][j + 1]) {
      i++
    } else {
      j++
    }
  }
  return pairs
}

/**
 * Replace the numbers of numeric attributes in `actual` with those in
 * the matching line of `expected` when the two are within `tolerance`,
 * so that comparing the result with `expected` ignores differences in
 * the last digits. Lines are matched by their content apart from those
 * numbers, so an added or removed line does not affect the others.
 */
export function alignNumbers(actual: string, expected: string, tolerance = 1e-6): string {
  const actualLines = actual.split("\n")
  const expectedLines = expected.split("\n").map(parseLine)
  const parsed = actualLines.map(parseLine)
  const pairs = pairLines(parsed, expectedLines)
  return actualLines
    .map((line, i) => {
      const j = pairs.get(i)
      if (j === undefined) return line
      const expectedNumbers = expectedLines[j].numbers
      let index = 0
      return line.replace(ATTRIBUTE, (match, head: string, name: string, value: string) => {
        if (!NUMERIC_ATTRIBUTES.has(name)) return match
        const aligned = value.replace(NUMBER, n => {
          const e = expectedNumbers[index++]
          return Math.abs(Number(n) - Number(e)) <= tolerance ? e : n
        })
        return `${head}${aligned}"`
      })
    })
    .join("\n")
}

/**
 * Align the numbers of `actual` with the file snapshot at `path`,
 * relative to the project root, if the snapshot exists.
 */
export async function alignWithSnapshot(actual: string, path: string): Promise<string> {
  let expected: string
  try {
    expected = await commands.readFile(path)
  } catch (error) {
    if (String(error).includes("ENOENT")) return actual
    throw error
  }
  return alignNumbers(actual, expected)
}
