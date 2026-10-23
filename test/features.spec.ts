/// <reference types="vite/client" />
import { describe, expect, test } from "vitest"
import { featureCases as cases } from "./helpers/cases"
import { mountGraph } from "./helpers/graph"
import { expectGraphToMatchSnapshot, snapshotNames } from "./helpers/snapshot"

const snapshots = snapshotNames(
  Object.keys(import.meta.glob("./__snapshots__/features/**/*.svg")),
  "features"
)

describe("features", () => {
  test.each(cases)("$name", async ({ name, props }) => {
    const { screen } = await mountGraph(props)

    await expectGraphToMatchSnapshot(screen.container, `features/${name}`)
  })

  test("has a case for every snapshot", () => {
    const names = cases.map(c => c.name)
    expect(new Set(names).size).toBe(names.length)
    expect(snapshots.filter(name => !names.includes(name))).toEqual([])
  })
})
