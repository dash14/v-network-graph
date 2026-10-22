import { FunctionalComponent, renderSlot, Slot } from "vue"

interface Props {
  render?: (props: any) => any
  slotProps: object
}

/**
 * Renders a slot function received as a prop, or the default slot when
 * the function is missing or renders nothing, as `<slot>` would.
 */
const VRenderSlot: FunctionalComponent<Props> = ({ render, slotProps }, { slots }) =>
  renderSlot(
    { content: render as Slot },
    "content",
    slotProps as Record<string, unknown>,
    slots.default
  )
VRenderSlot.props = ["render", "slotProps"]

export default VRenderSlot
