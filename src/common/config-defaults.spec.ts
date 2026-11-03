import { describe, expect, it } from "vitest"
import { getFullConfigs } from "./config-defaults"
import { Config } from "./configs"

describe("the default styles derived from the normal ones", () => {
  it("should follow the normal node, with the hovered one larger", () => {
    const configs = getFullConfigs({
      node: {
        normal: {
          type: "rect",
          width: 30,
          height: 20,
          borderRadius: 5,
          strokeWidth: 2,
          strokeColor: "#ff0000",
          strokeDasharray: "1 2",
        },
      },
    })
    const stroke = {
      borderRadius: 5,
      strokeWidth: 2,
      strokeColor: "#ff0000",
      strokeDasharray: "1 2",
    }
    expect(Config.values(configs.node.hover!, {})).toMatchObject({
      width: 32,
      height: 22,
      ...stroke,
    })
    expect(Config.values(configs.node.selected, {})).toMatchObject({
      width: 30,
      height: 20,
      ...stroke,
    })
  })

  it("should follow the normal edge, with the hovered and selected ones wider", () => {
    const configs = getFullConfigs({
      edge: {
        normal: {
          width: 4,
          dasharray: "1 2",
          linecap: "round",
          animate: true,
          animationSpeed: 10,
        },
      },
    })
    const animation = { linecap: "round", animate: true, animationSpeed: 10 }
    expect(Config.values(configs.edge.hover!, {} as any)).toMatchObject({
      width: 5,
      dasharray: "1 2",
      ...animation,
    })
    expect(Config.values(configs.edge.selected, {} as any)).toMatchObject({
      width: 5,
      dasharray: "6 8",
      ...animation,
    })
  })

  it("should follow the path style, with the hovered and selected paths wider", () => {
    const configs = getFullConfigs({
      path: {
        path: {
          width: 4,
          color: "#ff0000",
          dasharray: "1 2",
          linecap: "square",
          linejoin: "bevel",
          animate: true,
          animationSpeed: 10,
        },
      },
    })
    const path = { edges: [] }
    const style = {
      color: "#ff0000",
      linecap: "square",
      linejoin: "bevel",
      animate: true,
      animationSpeed: 10,
    }
    expect(Config.values(configs.path.normal, path)).toMatchObject({
      width: 4,
      dasharray: "1 2",
      ...style,
    })
    expect(Config.values(configs.path.hover!, path)).toMatchObject({
      width: 6,
      dasharray: "1 2",
      ...style,
    })
    expect(Config.values(configs.path.selected, path)).toMatchObject({ width: 6, ...style })
  })
})
