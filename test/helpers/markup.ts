import { expect, vi } from "vitest"
import { serializeGraph } from "./serialize"
import { alignNumbers } from "./snapshot"

/**
 * The graph's markup to compare with another graph's, without the instance number in the
 * marker ids and with the attributes sorted, since an attribute added on an update goes
 * after the others. An empty style is left out, as Vue leaves one when the styles are removed.
 */
export function markupOf(container: Element) {
  return serializeGraph(container, { sortAttributes: true })
    .replace(/marker_v-\d+_/g, "marker_")
    .replace(/ style=""/g, "")
}

/** Waits until the graph renders as `expected`, a `markupOf` result, within rounding errors. */
export async function expectToRenderAs(container: Element, expected: string) {
  await vi.waitFor(() => expect(alignNumbers(markupOf(container), expected)).toBe(expected), {
    timeout: 5000,
  })
}
