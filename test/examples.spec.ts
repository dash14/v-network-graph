/// <reference types="vite/client" />
import { describe, expect, test } from "vitest"
import { Component } from "vue"
import { renderFixture } from "./helpers/render"
import { serializeGraph } from "./helpers/serialize"
import { alignWithSnapshot } from "./helpers/snapshot"

// Adapted from the examples in the documentation, without their control panels.
const fixtures = import.meta.glob<Component>("./fixtures/**/Fixture.vue", {
  eager: true,
  import: "default",
})

const cases = Object.entries(fixtures).map(([path, component]) => ({
  name: path.replace(/^\.\/fixtures\/(.*)\/Fixture\.vue$/, "$1"),
  component,
}))

describe("examples", () => {
  test.each(cases)("$name", async ({ name, component }) => {
    const screen = await renderFixture(component)

    const snapshot = `__snapshots__/examples/${name}.svg`
    // File commands resolve paths from the project root, and file snapshots from the test file.
    const actual = await alignWithSnapshot(serializeGraph(screen.container), `test/${snapshot}`)
    await expect(actual).toMatchFileSnapshot(snapshot)
  })
})
