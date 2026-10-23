import { expect, vi } from "vitest"
import { POLL_INTERVAL } from "./container"
import { serializeGraph } from "./serialize"
import { alignNumbers } from "./snapshot"

export interface MarkupOptions {
  /** Leave out the empty styles, which Vue leaves when the styles of an element are removed. */
  ignoreEmptyStyles?: boolean
}

/**
 * The graph's markup to compare with another graph's, without the instance number in the
 * marker ids and with the attributes sorted, since an attribute added on an update goes
 * after the others.
 */
export function markupOf(container: Element, options: MarkupOptions = {}) {
  const markup = serializeGraph(container, { sortAttributes: true }).replace(
    /marker_v-\d+_/g,
    "marker_"
  )
  return options.ignoreEmptyStyles ? markup.replace(/ style=""/g, "") : markup
}

/** Waits until the graph renders as `expected`, a `markupOf` result, within rounding errors. */
export async function expectToRenderAs(
  container: Element,
  expected: string,
  options: MarkupOptions = {}
) {
  await vi.waitFor(
    () => expect(alignNumbers(markupOf(container, options), expected)).toBe(expected),
    { timeout: 5000, interval: POLL_INTERVAL }
  )
}
