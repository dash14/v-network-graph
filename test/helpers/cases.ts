/// <reference types="vite/client" />
import { Component } from "vue"
import { GraphCase } from "./graph"

// Adapted from the examples in the documentation, without their control panels.
const fixtures = import.meta.glob<Component>("../fixtures/**/Fixture.vue", {
  eager: true,
  import: "default",
})

export const exampleCases = Object.entries(fixtures).map(([path, component]) => ({
  name: path.replace(/^\.\.\/fixtures\/(.*)\/Fixture\.vue$/, "$1"),
  component,
}))

// Settings that the documentation examples leave out, grouped by the feature they cover.
const modules = import.meta.glob<GraphCase[]>("../features/*.ts", {
  eager: true,
  import: "default",
})

export const featureCases = Object.entries(modules).flatMap(([path, featureCases]) => {
  const feature = path.replace(/^\.\.\/features\/(.*)\.ts$/, "$1")
  return featureCases.map(c => ({ ...c, name: `${feature}/${c.name}` }))
})
