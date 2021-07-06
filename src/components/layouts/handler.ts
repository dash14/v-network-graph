
import { Emitter } from "mitt"
import { Events, Links, NodePositions } from "../common/types"

export abstract class AbstractLayoutHandler {
    constructor(protected layouts: NodePositions, protected links: Links, protected emitter: Emitter<Events>) {
    }

    abstract activate(): void

    abstract deactivate(): void
}
