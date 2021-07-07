import { Events, Link, Links, NodePositions, Position } from "@/common/types"
import { toRef } from "@vue/reactivity"
import {
  forceCenter,
  forceCollide,
  ForceLink,
  forceLink,
  forceManyBody,
  forceSimulation,
  Simulation,
  SimulationNodeDatum,
} from "d3-force"
import { Emitter } from "mitt"
import { LayoutHandler } from "./handler"

export interface ForceNodeDatum extends SimulationNodeDatum {
  id: string
}

export interface ForceLinkDatum extends Link {
  index: number
}

export type ForceLinks = ForceLink<SimulationNodeDatum, ForceLinkDatum>

export type CreateSimulationFunction = (
  nodes: ForceNodeDatum[],
  links: ForceLinks
) => Simulation<ForceNodeDatum, ForceLinkDatum>

type OnClickHandler = (param: Events["node:click"]) => void
type OnDragHandler = (param: Events["node:mousemove"]) => void
type OnDragEndHandler = (param: Events["node:dragend"]) => void

export type ForceLayoutParameters = {
  positionFixedByDrag?: boolean
  positionFixedByClickWithAltKey?: boolean
  createSimulation?: CreateSimulationFunction
}

export class ForceLayoutHandler implements LayoutHandler {
  private onDeactivate?: () => void

  constructor(private options: ForceLayoutParameters = {}) {}

  activate(layouts: NodePositions, links: Links, emitter: Emitter<Events>): void {
    const nodes = this.forceLayoutNodes(layouts)
    const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]))

    const simulation = this.createSimulation(
      nodes,
      forceLink(this.forceLayoutLinks(links)).id((d: any) => d.id)
    )
    simulation.on("tick", () => {
      for (const node of nodes) {
        const layout = layouts?.[node.id]
        if (layout) {
          layout.x = node.x ?? 0
          layout.y = node.y ?? 0
        }
      }
    })

    const restartSimulation = () => {
      simulation.alpha(0.3).restart()
    }

    const onDrag: OnDragHandler = (positions: { [name: string]: Position }) => {
      for (const [id, pos] of Object.entries(positions)) {
        const nodePos = nodeMap[id]
        nodePos.fx = pos.x
        nodePos.fy = pos.y
      }
      restartSimulation()
    }

    const onDragEnd: OnDragEndHandler = (positions: { [name: string]: Position }) => {
      for (const [id, pos] of Object.entries(positions)) {
        const layout = this.getNodeLayout(layouts, id)
        const nodePos: SimulationNodeDatum = nodeMap?.[id] ?? { x: 0, y: 0 }
        if (layout.value.fixed || this.options.positionFixedByDrag) {
          nodePos.fx = pos.x
          nodePos.fy = pos.y
          layout.value.fixed = true
        } else {
          nodePos.x = pos.x
          nodePos.y = pos.y
          delete nodePos.fx
          delete nodePos.fy
        }
      }
      restartSimulation()
    }

    const onClick: OnClickHandler = ({ node, event }) => {
      if (this.options.positionFixedByClickWithAltKey && event.altKey) {
        const layout = this.getNodeLayout(layouts, node)
        let nodePos: ForceNodeDatum | undefined = nodeMap?.[node]
        if (!nodePos) {
          nodePos = {id: node, x: 0, y: 0}
          nodeMap[node] = nodePos
        }

        if (layout.value.fixed) {
          // unfix
          delete layout.value.fixed
          nodePos.x = nodePos.fx || nodePos.x
          nodePos.y = nodePos.fy || nodePos.y
          delete nodePos.fx
          delete nodePos.fy
        } else {
          // fix
          layout.value.fixed = true
          nodePos.fx = nodePos.x
          nodePos.fy = nodePos.y
        }
        restartSimulation()
      }
    }

    emitter.on("node:dragstart", onDrag)
    emitter.on("node:mousemove", onDrag)
    emitter.on("node:dragend", onDragEnd)
    emitter.on("node:click", onClick)

    this.onDeactivate = () => {
      emitter.off("node:dragstart", onDrag)
      emitter.off("node:mousemove", onDrag)
      emitter.off("node:dragend", onDragEnd)
      emitter.off("node:click", onClick)
    }

    // watch -> links
    // watch -> nodes
  }

  deactivate(): void {
    if (this.onDeactivate) {
      this.onDeactivate()
    }
  }

  private createSimulation(
    nodes: ForceNodeDatum[],
    links: ForceLinks
  ): Simulation<ForceNodeDatum, ForceLinkDatum> {
    if (this.options.createSimulation) {
      return this.options.createSimulation(nodes, links)
    } else {
      return forceSimulation(nodes)
      .force("link", links.distance(100))
      .force("charge", forceManyBody())
      .force("collide", forceCollide(50))
      .force("center", forceCenter().strength(0.05))
      .alphaMin(0.01)
    }
  }

  private getNodeLayout(layouts: NodePositions, node: string) {
    const layout = toRef(layouts, node)
    if (!layout.value) {
      layout.value = {x: 0, y: 0}
    }
    return layout
  }

  private forceLayoutNodes(layouts: NodePositions): ForceNodeDatum[] {
    return Object.entries(layouts).map(([id, v]) => ({ id, ...v }))
  }

  private forceLayoutLinks(links: Links): ForceLinkDatum[] {
    // d3-forceによってlink内のsource/targetがNodeDatumオブジェクトに
    // 置き換えられてしまうため、独自のリンクオブジェクトを構築する.
    return Object.values(links).map((v, index) => ({
      index,
      source: v.source,
      target: v.target,
    }))
  }
}
