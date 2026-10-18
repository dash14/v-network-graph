import { describe, expect, test } from "vitest"
import { alignNumbers } from "./helpers/snapshot"

describe("alignNumbers", () => {
  test("takes the expected numbers within the tolerance", () => {
    const expected = '<path d="M 0.1 2.0000001 L -3 4" />'
    const actual = '<path d="M 0.1000000000000001 2.0000002 L -3.0000000001 4" />'

    expect(alignNumbers(actual, expected)).toBe(expected)
  })

  test("keeps the actual numbers out of the tolerance", () => {
    const expected = '<circle cx="10" cy="20" r="16" />'
    const actual = '<circle cx="10.001" cy="20" r="18" />'

    expect(alignNumbers(actual, expected)).toBe(actual)
  })

  test("leaves a line as is when its other attributes differ", () => {
    const expected = '<rect id="node01" fill="#000000" x="1" />'
    const actual = '<rect id="node1" fill="#000" x="1.0000000001" />'

    expect(alignNumbers(actual, expected)).toBe(actual)
  })

  test("compares numbers in text content exactly", () => {
    const expected = '<text x="1">\n  1 Gbps\n</text>'
    const actual = '<text x="1.0000000001">\n  1.0000000001 Gbps\n</text>'

    expect(alignNumbers(actual, expected)).toBe('<text x="1">\n  1.0000000001 Gbps\n</text>')
  })

  test("aligns the lines around an added line", () => {
    const expected = ['<g transform="translate(1 2)" />', '<circle r="3" />'].join("\n")
    const actual = [
      '<g transform="translate(1.0000000001 2)" />',
      '<rect width="5" />',
      '<circle r="3.0000000001" />',
    ].join("\n")

    expect(alignNumbers(actual, expected)).toBe(
      ['<g transform="translate(1 2)" />', '<rect width="5" />', '<circle r="3" />'].join("\n")
    )
  })
})
