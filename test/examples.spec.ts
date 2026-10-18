/// <reference types="vite/client" />
import { describe, expect, test } from "vitest"
import { Component } from "vue"
import { renderFixture } from "./helpers/render"
import { serializeGraph } from "./helpers/serialize"

// Adapted from the examples in the documentation, without their control panels.
const fixtures = import.meta.glob<Component>("./fixtures/**/*.vue", {
  eager: true,
  import: "default",
})

describe("examples", () => {
  test.each(Object.entries(fixtures))("%s", async (path, component) => {
    const screen = await renderFixture(component)

    expect(serializeGraph(screen.container)).toMatchSnapshot()
  })
})
