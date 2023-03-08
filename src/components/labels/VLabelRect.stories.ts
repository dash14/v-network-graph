import { Meta, StoryObj } from "@storybook/vue3"
import { computed } from "vue"
import { labelStyleWithDefaults, wrapSvg, setupSvg } from "@/stories/functions"
import { Vector2D } from "@/modules/vector2d/vector2d"

import { LabelRectangle } from "@/common/types"
import { Point2D } from "@/modules/vector2d/core"
import VLabelRect from "./VLabelRect.vue"

export default {
  title: "Labels/VLabelRect",
  component: VLabelRect,
  argTypes: {
    text: {
      control: "text",
    },
    align: {
      control: { type: "select" },
      options: ["center", "source", "target"],
    },
    verticalAlign: {
      control: { type: "select" },
      options: ["center", "above", "below"],
    },
    visibleGuide: {
      control: { type: "boolean" },
    },
    angle: {
      control: { type: "range", min: 0, max: 360, step: 5 },
    },
    boxWidth: {
      control: { type: "range", min: 0, max: 100, step: 10 },
      defaultValue: 100,
    },
    boxHeight: {
      control: { type: "range", min: 0, max: 100, step: 10 },
      defaultValue: 100,
    },
    flipX: {
      control: { type: "boolean" },
    },
    flipY: {
      control: { type: "boolean" },
    },
  },
} as Meta

const Template: StoryObj = {
  render: args => ({
    components: { VLabelRect },
    setup: () => {
      return {
        ...setupSvg(),
        args: computed(() => {
          const { text, align, verticalAlign, config, visibleGuide, angle } = args as any
          const { boxWidth, boxHeight, flipX, flipY } = args as any

          const center = { x: 100, y: 100 }
          const area = calculateRotatedRectangle(boxWidth, boxHeight, angle, center)

          if (flipX) {
            [area.source, area.target] = [area.target, area.source]
          }
          if (flipY) {
            [area.source.top, area.source.bottom] = [area.source.bottom, area.source.top]
            ;[area.target.top, area.target.bottom] = [area.target.bottom, area.target.top]
          }

          return {
            text,
            align,
            verticalAlign,
            config,
            visibleGuide,
            area,
          }
        }),
      }
    },
    template: wrapSvg('<VLabelRect v-bind="args" />'),
  }),
}

const defaultArgs = {
  text: "Label text",
  config: labelStyleWithDefaults(),
  align: "center",
  verticalAlign: "center",
  visibleGuide: true,
  angle: 0,
  boxWidth: 100,
  boxHeight: 50,
  flipX: false,
  flipY: false,
}

export const Center: StoryObj = {
  ...Template,
  args: {
    ...defaultArgs,
  },
}

export const SourceAbove: StoryObj = {
  ...Template,
  args: {
    ...defaultArgs,
    align: "source",
    verticalAlign: "above",
  },
}

export const TargetAbove: StoryObj = {
  ...Template,
  args: {
    ...defaultArgs,
    align: "target",
    verticalAlign: "above",
  },
}

export const SourceBelow: StoryObj = {
  ...Template,
  args: {
    ...defaultArgs,
    align: "source",
    verticalAlign: "below",
  },
}

export const TargetBelow: StoryObj = {
  ...Template,
  args: {
    ...defaultArgs,
    align: "target",
    verticalAlign: "below",
  },
}

export const FlipX: StoryObj = {
  ...Template,
  args: {
    ...defaultArgs,
    align: "source",
    verticalAlign: "above",
    flipX: true,
  },
}

export const FlipY: StoryObj = {
  ...Template,
  args: {
    ...defaultArgs,
    align: "source",
    verticalAlign: "above",
    flipY: true,
  },
}

export const Angle90: StoryObj = {
  ...Template,
  args: {
    ...defaultArgs,
    align: "source",
    verticalAlign: "above",
    angle: 90,
  },
}

export const Angle270: StoryObj = {
  ...Template,
  args: {
    ...defaultArgs,
    align: "source",
    verticalAlign: "above",
    angle: 270,
  },
}

export const Angle90WithFlipX: StoryObj = {
  ...Template,
  args: {
    ...defaultArgs,
    align: "source",
    verticalAlign: "above",
    angle: 90,
    flipX: true,
  },
}

export const Angle270WithFlipX: StoryObj = {
  ...Template,
  args: {
    ...defaultArgs,
    align: "source",
    verticalAlign: "above",
    angle: 270,
    flipX: true,
  },
}

// ---

const DEG2RAD = Math.PI / 180
const round = (v: number) => Math.round(v * 1000) / 1000

function calculateRotatedRectangle(
  boxWidth: number,
  boxHeight: number,
  angleDegree: number,
  center: Point2D
): LabelRectangle {
  const horizontal = Vector2D.fromObject({ x: boxWidth / 2, y: 0 }).rotate(angleDegree * DEG2RAD)
  const vertical = horizontal
    .clone()
    .normalize()
    .rotate(Math.PI / 2)
    .multiplyScalar(boxHeight / 2)
  const p1 = Vector2D.fromObject(center)
  const source = {
    top: p1.clone().subtract(horizontal).subtract(vertical).toObject(),
    bottom: p1.clone().subtract(horizontal).add(vertical).toObject(),
  }
  const target = {
    top: p1.clone().add(horizontal).subtract(vertical).toObject(),
    bottom: p1.clone().add(horizontal).add(vertical).toObject(),
  }
  source.top.x = round(source.top.x)
  source.top.y = round(source.top.y)
  source.bottom.x = round(source.bottom.x)
  source.bottom.y = round(source.bottom.y)
  target.top.x = round(target.top.x)
  target.top.y = round(target.top.y)
  target.bottom.x = round(target.bottom.x)
  target.bottom.y = round(target.bottom.y)
  return { source, target }
}
