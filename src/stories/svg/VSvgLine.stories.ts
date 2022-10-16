import { Meta, Story } from "@storybook/vue3"
import VSvgLine from "@/components/svg/VSvgLine.vue"

// More on default export: https://storybook.js.org/docs/vue/writing-stories/introduction#default-export
export default {
  title: "SVG/VSvgLine",
  component: VSvgLine,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    sourceMargin: {
      control: { type: "range", min: 1, max: 50, step: 1 },
    },
    targetMargin: {
      control: { type: "range", min: 1, max: 50, step: 1 },
    },
    scale: {
      control: { type: "range", min: 1, max: 10, step: 1 },
    },
  },
} as Meta

// More on component templates: https://storybook.js.org/docs/vue/writing-stories/introduction#using-args
const Template: Story = args => ({
  // Components used in your story `template` are defined in the `components` object
  components: { VSvgLine },
  // The story's `args` need to be mapped into the template through the `setup()` method
  setup() {
    return { args }
  },
  template: `
    <svg class="story-short"  xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <v-svg-line v-bind="args" />
    </svg>`,
})

export const Line = Template.bind({})
Line.args = {
  source: { x: 200, y: 20 },
  target: { x: 20, y: 140 },
  sourceMargin: 0,
  targetMargin: 0,
  config: {
    color: "#0000ff",
    width: 2,
    dasharray: "0",
    linecap: "butt",
    animate: false,
    animationSpeed: 0,
  },
  scale: 1.0,
}
