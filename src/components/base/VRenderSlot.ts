import { FunctionalComponent } from "vue"

interface Props {
  render?: (props: any) => any
  slotProps: object
}

/** Renders a slot function received as a prop. */
const VRenderSlot: FunctionalComponent<Props> = props => props.render?.(props.slotProps)
VRenderSlot.props = ["render", "slotProps"]

export default VRenderSlot
