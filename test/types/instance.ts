import * as vNG from "v-network-graph"
import { ref } from "vue"

// Emitting declarations fails with TS4023 when an instance type refers to an unexported name.
export const graph = ref<vNG.Instance>()
export const lite = ref<vNG.VNetworkGraphLiteInstance>()
export const shape = ref<InstanceType<typeof vNG.VShape>>()
export const style = ref<InstanceType<typeof vNG.VStyle>>()
export const edgeLabel = ref<InstanceType<typeof vNG.VEdgeLabel>>()
export const labelText = ref<InstanceType<typeof vNG.VLabelText>>()
