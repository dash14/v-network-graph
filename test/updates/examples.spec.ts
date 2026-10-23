import { describe, test } from "vitest"
import { exampleCases } from "../helpers/cases"
import { expectToRenderAs, markupOf } from "../helpers/markup"
import { renderFixtureWithState } from "../helpers/render"
import { updates } from "../helpers/updates"

// The force layout places the nodes itself, so they do not stay where an update puts them.
const cases = exampleCases.filter(c => !c.name.startsWith("layout/force-layout"))

// Updates whose result a fixture cannot render.
const unsupported: Record<string, string[]> = {
  // Its labels read the traffic between each pair of nodes, which an added node has none of.
  "labels/multiple-edge-labels": ["add a node with an edge"],
}

describe.each(updates)("$name after mount", ({ name, update }) => {
  const supported = cases.filter(c => !unsupported[c.name]?.includes(name))

  test.each(supported)("renders examples/$name as mounting the result does", async c => {
    const fresh = await renderFixtureWithState(c.component, update)
    const expected = markupOf(fresh.screen.container)
    fresh.unmount()

    const { screen, state } = await renderFixtureWithState(c.component)
    update(state)
    await expectToRenderAs(screen.container, expected)
  })
})
