import { expect } from "vitest"
import { commands, server } from "vitest/browser"
import { serializeGraph, SerializeOptions } from "./serialize"

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
  /** The line with the numbers of numeric attributes masked. */
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

/** Pairs lines by the longest common subsequence of their shapes. */
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
 * Takes the numbers of numeric attributes from the paired line of
 * `expected` wherever `actual` is within `tolerance` of them.
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

/** `path` is absolute or relative to the project root. */
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

/** Compares the graph in the container with the file snapshot `test/__snapshots__/<name>.svg`. */
export async function expectGraphToMatchSnapshot(
  container: Element,
  name: string,
  options: SerializeOptions = {}
) {
  const snapshot = `${server.config.root}/test/__snapshots__/${name}.svg`
  const actual = await alignWithSnapshot(serializeGraph(container, options), snapshot)
  await expect(actual).toMatchFileSnapshot(snapshot)
}

/** Names of the snapshots in `test/__snapshots__/<dir>/`, to find those left behind. */
export function snapshotNames(paths: string[], dir: string) {
  const prefix = `__snapshots__/${dir}/`
  return paths.map(path => {
    const start = path.indexOf(prefix)
    if (start < 0) throw new Error(`${path} is not in ${prefix}`)
    return path.slice(start + prefix.length, -".svg".length)
  })
}
