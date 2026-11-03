import { afterEach, describe, expect, it, vi } from "vitest"
import { getConfigDefaults } from "./config-defaults"
import { configsWithType, defineConfigs, defineLiteConfigs } from "./configs"

describe("defining the configs", () => {
  it("should return the configs as they are given", () => {
    const configs = { node: { selectable: true } }
    expect(defineConfigs(configs)).toBe(configs)
    expect(configsWithType(configs)).toBe(configs)
    expect(defineLiteConfigs(configs)).toBe(configs)
  })
})

describe("the default detector of box selection", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  const detect = (userAgent: string, init: KeyboardEventInit, type = "keydown") => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(userAgent)
    const { detector } = getConfigDefaults().view.selection
    return detector({ type, ...init } as KeyboardEvent)
  }

  it.each([
    { os: "macOS", userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", key: "metaKey" },
    { os: "the others", userAgent: "Mozilla/5.0 (X11; Linux x86_64)", key: "ctrlKey" },
  ])("should start with $key down and end with it up on $os", ({ userAgent, key }) => {
    expect(detect(userAgent, { [key]: true })).toBe(true)
    expect(detect(userAgent, { [key]: false })).toBe(false)
    expect(detect(userAgent, { [key]: false }, "keyup")).toBe(true)
  })
})
