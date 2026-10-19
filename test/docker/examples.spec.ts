/// <reference types="vite/client" />
import { describe, expect, test } from "vitest"
import { page } from "vitest/browser"
import { Component } from "vue"
import { renderFixture } from "../helpers/render"
import { expectGraphToMatchSnapshot, fileNames } from "../helpers/snapshot"

// The examples whose output depends on the fonts, with the pan kept in the snapshots.
const fixtures = import.meta.glob<Component>("./fixtures/**/Fixture.vue", {
  eager: true,
  import: "default",
})

const cases = Object.entries(fixtures).map(([path, component]) => ({
  name: path.replace(/^\.\/fixtures\/(.*)\/Fixture\.vue$/, "$1"),
  component,
}))

const snapshots = fileNames(
  Object.keys(import.meta.glob("../__snapshots__/docker/examples/**/*.svg")),
  "../__snapshots__/docker/examples/"
)
const screenshots = fileNames(
  Object.keys(import.meta.glob("./__screenshots__/examples.spec.ts/**/*.png")),
  "./__screenshots__/examples.spec.ts/"
).map(name => name.replace(/-chromium-linux$/, ""))

describe("examples", () => {
  test.each(cases)("$name", async ({ name, component }) => {
    const screen = await renderFixture(component)

    await expectGraphToMatchSnapshot(screen.container, `docker/examples/${name}`, { pan: true })
    const graph = screen.container.querySelector(".v-network-graph")!
    await expect.element(page.elementLocator(graph)).toMatchScreenshot(name)
  })

  test("has a fixture for every snapshot and screenshot", () => {
    const names = cases.map(c => c.name)
    expect(snapshots.filter(name => !names.includes(name))).toEqual([])
    expect(screenshots.filter(name => !names.includes(name))).toEqual([])
  })
})
