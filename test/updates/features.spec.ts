import { describe, test } from "vitest"
import { featureCases } from "../helpers/cases"
import { mountGraph } from "../helpers/graph"
import { expectToRenderAs, markupOf } from "../helpers/markup"
import { updates } from "../helpers/updates"

describe.each(updates)("$name after mount", ({ update }) => {
  test.each(featureCases)("renders features/$name as mounting the result does", async c => {
    const { configs, ...data } = c.props
    const after = {
      edges: {},
      paths: {},
      selectedNodes: [],
      selectedEdges: [],
      selectedPaths: [],
      zoomLevel: 1,
      ...structuredClone(data),
      configs,
    }
    update(after)
    const fresh = await mountGraph(after)
    const expected = markupOf(fresh.screen.container)

    const { screen, state } = await mountGraph({ zoomLevel: 1, ...c.props })
    update(state)
    await expectToRenderAs(screen.container, expected)
  })
})
