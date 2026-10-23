/// <reference types="vite/client" />
import { describe, expect, test } from "vitest"
import { exampleCases as cases } from "./helpers/cases"
import { renderFixture } from "./helpers/render"
import { expectGraphToMatchSnapshot, snapshotNames } from "./helpers/snapshot"

const snapshots = snapshotNames(
  Object.keys(import.meta.glob("./__snapshots__/examples/**/*.svg")),
  "examples"
)

describe("examples", () => {
  test.each(cases)("$name", async ({ name, component }) => {
    const screen = await renderFixture(component)

    await expectGraphToMatchSnapshot(screen.container, `examples/${name}`)
  })

  test("has a fixture for every snapshot", () => {
    const names = cases.map(c => c.name)
    expect(snapshots.filter(name => !names.includes(name))).toEqual([])
  })
})
