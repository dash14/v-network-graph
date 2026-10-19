/// <reference types="vite/client" />
import { describe, expect, test } from "vitest"
import { Component } from "vue"
import { renderFixture } from "./helpers/render"
import { expectGraphToMatchSnapshot, snapshotNames } from "./helpers/snapshot"

// Adapted from the examples in the documentation, without their control panels.
const fixtures = import.meta.glob<Component>("./fixtures/**/Fixture.vue", {
  eager: true,
  import: "default",
})

const cases = Object.entries(fixtures).map(([path, component]) => ({
  name: path.replace(/^\.\/fixtures\/(.*)\/Fixture\.vue$/, "$1"),
  component,
}))

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
