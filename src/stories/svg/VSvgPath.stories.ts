import { Meta, Story } from "@storybook/vue3"
import VSvgPath from "@/components/svg/VSvgPath.vue"

// More on default export: https://storybook.js.org/docs/vue/writing-stories/introduction#default-export
export default {
  title: "SVG/VSvgPath",
  component: VSvgPath,
  parameters: {
    layout: "fullscreen",
  },
  argTypes: {
    d: {
      control: { type: "select" },
      options: [
        "M 10 10 L 80 80", // line
        "M 50 20 A 24 24 0 1 0 50 40", // arc
      ],
    },
    width: {
      control: { type: "range", min: 1, max: 10, step: 1 },
    },
    color: {
      control: {
        type: "color",
        presetColors: ["#ff0000", "#00ff00", "#0000ff"],
      },
    },
    dasharray: {
      control: "text",
    },
    linecap: {
      control: { type: "select" },
      options: ["butt", "round", "square"],
    },
    animate: {
      control: "boolean",
    },
    animationSpeed: {
      control: { type: "range", min: 0, max: 200, step: 10 },
    },
    scale: {
      control: { type: "range", min: 1, max: 10, step: 1 },
    },
  },
} as Meta

// More on component templates: https://storybook.js.org/docs/vue/writing-stories/introduction#using-args
const Template: Story = args => ({
  // Components used in your story `template` are defined in the `components` object
  components: { VSvgPath },
  // The story's `args` need to be mapped into the template through the `setup()` method
  setup() {
    return {
      args: {
        d: args.d,
        config: {
          width: args.width,
          color: args.color,
          dasharray: args.dasharray,
          linecap: args.linecap,
          animate: args.animate,
          animationSpeed: args.animationSpeed,
        },
        scale: args.scale,
      },
    }
  },
  template: `
    <svg class="story-short"  xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <v-svg-path v-bind="args" />
    </svg>`,
})

export const Path = Template.bind({})
Path.args = {
  d: "M 10 10 L 80 80",
  width: 1,
  color: "#000",
  dasharray: "0",
  linecap: "butt",
  animate: false,
  animationSpeed: 40,
  scale: 1.0,
}
