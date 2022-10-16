import { Meta, Story } from "@storybook/vue3"
import VSvgCircle from "@/components/svg/VSvgCircle.vue"

// More on default export: https://storybook.js.org/docs/vue/writing-stories/introduction#default-export
export default {
  title: "SVG/VSvgCircle",
  component: VSvgCircle,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    x: {
      control: { type: "range", min: 1, max: 100, step: 1 },
    },
    y: {
      control: { type: "range", min: 1, max: 100, step: 1 },
    },
    radius: {
      control: { type: "range", min: 1, max: 50, step: 1 },
    },
    color: {
      control: {
        type: "color",
        presetColors: ["#ff0000", "#00ff00", "#0000ff"],
      },
    },
    strokeWidth: {
      control: { type: "range", min: 0, max: 10, step: 1 },
    },
    strokeColor: {
      control: {
        type: "color",
        presetColors: ["#ff0000", "#00ff00", "#0000ff"],
      },
    },
    strokeDasharray: {
      control: "text",
    },
    scale: {
      control: { type: "range", min: 1, max: 10, step: 1 },
    },
  },
} as Meta

// More on component templates: https://storybook.js.org/docs/vue/writing-stories/introduction#using-args
const Template: Story = args => ({
  // Components used in your story `template` are defined in the `components` object
  components: { VSvgCircle },
  // The story's `args` need to be mapped into the template through the `setup()` method
  setup() {
    return {
      args: {
        x: args.x,
        y: args.y,
        radius: args.radius,
        config: {
          type: "circle",
          color: args.color,
          strokeWidth: args.strokeWidth,
          strokeColor: args.strokeColor,
          strokeDasharray: args.strokeDasharray,
        },
        scale: args.scale,
      },
    }
  },
  template: `
    <svg class="story-short"  xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <v-svg-circle v-bind="args" />
    </svg>`,
})

export const Circle = Template.bind({})
Circle.args = {
  x: 20,
  y: 20,
  radius: 20,
  color: "#0000ff",
  strokeWidth: 0,
  strokeColor: "#ff0000",
  strokeDasharray: "0",
  scale: 1.0,
}
