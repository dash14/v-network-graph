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

    expect(alignNumbers(actual, expected)).toBe('<circle cx="10.001" cy="20" r="18" />')
  })

  test("leaves text content as is", () => {
    const expected = '<text x="1">\n  1 Gbps\n</text>'
    const actual = '<text x="1.0000000001">\n  1.0000000001 Gbps\n</text>'

    expect(alignNumbers(actual, expected)).toBe('<text x="1">\n  1.0000000001 Gbps\n</text>')
  })

  test("keeps the numbers beyond those in the expected", () => {
    const expected = '<g transform="translate(1 2)" />'
    const actual = '<g transform="translate(1 2)" /><g transform="translate(3 4)" />'

    expect(alignNumbers(actual, expected)).toBe(actual)
  })
})
