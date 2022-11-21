import { Meta, StoryObj } from "@storybook/vue3"
import VSvgPath from "@/components/svg/VSvgPath.vue"
import { strokeStyleWithDefaults, wrapSvg } from "../functions"

export default {
  component: VSvgPath,
  argTypes: {
    d: {
      control: { type: "select" },
      options: [
        "M 10 10 L 80 80", // line
        "M 50 20 A 24 24 0 1 0 50 40", // arc
      ],
    },
    scale: {
      control: { type: "range", min: 1, max: 10, step: 1 },
    },
  },
} as Meta

const Template: StoryObj = {
  render: args => ({
    components: { VSvgPath },
    setup: () => ({ args }),
    template: wrapSvg('<VSvgPath v-bind="args" />', "story-short"),
  }),
}

export const Line: StoryObj = {
  ...Template,
  args: {
    d: "M 10 10 L 80 80",
    config: strokeStyleWithDefaults(),
    scale: 1.0,
  },
}

export const Arc: StoryObj = {
  ...Template,
  args: {
    d: "M 50 20 A 24 24 0 1 0 50 40",
    config: strokeStyleWithDefaults(),
    scale: 1.0,
  },
}

export const Animated: StoryObj = {
  ...Template,
  args: {
    d: "M 50 20 A 24 24 0 1 0 50 40",
    config: strokeStyleWithDefaults({
      dasharray: "6",
      animate: true
    }),
    scale: 1.0,
  },
}
