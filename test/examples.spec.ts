/// <reference types="vite/client" />
import { describe, expect, test } from "vitest"
import { Component } from "vue"
import { renderFixture } from "./helpers/render"
import { serializeGraph } from "./helpers/serialize"

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
  test.each(cases)("$name", async ({ component }) => {
    const screen = await renderFixture(component)

    expect(serializeGraph(screen.container)).toMatchSnapshot()
  })
})
