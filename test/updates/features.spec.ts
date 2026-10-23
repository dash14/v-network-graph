import { describe, test } from "vitest"
import { cleanup } from "vitest-browser-vue"
import { featureCases } from "../helpers/cases"
import { fillGraphProps, mountGraph } from "../helpers/graph"
import { expectToRenderAs, markupOf } from "../helpers/markup"
import { updates } from "../helpers/updates"

describe.each(updates)("$name after mount", ({ update }) => {
  test.each(featureCases)("renders features/$name as mounting the result does", async c => {
    const after = fillGraphProps(c.props)
    update(after)
    const fresh = await mountGraph(after)
    const expected = markupOf(fresh.screen.container)
    cleanup()

    const { screen, state } = await mountGraph({ zoomLevel: 1, ...c.props })
    update(state)
    await expectToRenderAs(screen.container, expected)
  })
})
