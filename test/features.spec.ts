/// <reference types="vite/client" />
import { describe, expect, test } from "vitest"
import { GraphCase, mountGraph } from "./helpers/graph"
import { expectGraphToMatchSnapshot, snapshotNames } from "./helpers/snapshot"

// Settings that the documentation examples leave out, grouped by the feature they cover.
const modules = import.meta.glob<GraphCase[]>("./features/*.ts", {
  eager: true,
  import: "default",
})

const cases = Object.entries(modules).flatMap(([path, featureCases]) => {
  const feature = path.replace(/^\.\/features\/(.*)\.ts$/, "$1")
  return featureCases.map(c => ({ ...c, name: `${feature}/${c.name}` }))
})

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
