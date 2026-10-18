import { config } from "vitest-browser-vue"

// The default stubs render as unknown elements inside the SVG, which hides nodes and labels.
config.global.stubs = { transition: false, "transition-group": false }
