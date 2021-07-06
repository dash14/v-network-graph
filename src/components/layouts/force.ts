import { Events, Link, Links, NodePositions, Position } from "@/common/types"
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
import { AbstractLayoutHandler } from "./handler"

export interface ForceNodeDatum extends SimulationNodeDatum {
  id: string
}

export interface ForceLinkDatum extends Link {
  index: number
}

export type ForceLinks = ForceLink<SimulationNodeDatum, ForceLinkDatum>

export class ForceLayoutHandler extends AbstractLayoutHandler {
  simulation?: Simulation<ForceNodeDatum, ForceLinkDatum>
  nodes: ForceNodeDatum[] = []
  nodeMap: { [name: string]: ForceNodeDatum } = {}
  active = true

  constructor(layouts: NodePositions, links: Links, emitter: Emitter<Events>) {
    super(layouts, links, emitter)
  }

  activate(): void {
    this.nodes = this.forceLayoutNodes()
    this.nodeMap = Object.fromEntries(this.nodes.map(n => [n.id, n]))

    const simulation = this.createSimulation(
      this.nodes,
      forceLink(this.forceLayoutLinks()).id((d: any) => d.id)
    )
    simulation
      .on("tick", () => {
        for (const node of this.nodes) {
          const layout = this.layouts[node.id]
          layout.x = node.x ?? 0
          layout.y = node.y ?? 0
        }
      })
      .on("end", () => {
        this.active = false
      })
    this.simulation = simulation

    const onDrag = (positions: { [name: string]: Position }) => {
      for (const [id, pos] of Object.entries(positions)) {
        const nodePos = this.nodeMap[id]
        nodePos.fx = pos.x
        nodePos.fy = pos.y
      }
      if (!this.active) {
        this.active = true
        simulation.alpha(1).restart()
      }
    }

    this.emitter.on("node:dragstart", onDrag)
    this.emitter.on("node:mousemove", onDrag)
    this.emitter.on("node:dragend", positions => {
      for (const [id, pos] of Object.entries(positions)) {
        const nodePos: SimulationNodeDatum = this.nodeMap[id] ?? { x: 0, y: 0 }
        nodePos.x = pos.x
        nodePos.y = pos.y
        delete nodePos.fx
        delete nodePos.fy
      }
      this.active = true
      simulation.alpha(1).restart()
    })

    // watch -> links
    // watch -> nodes
  }

  deactivate(): void {
    throw new Error("Method not implemented.")
  }

  protected createSimulation(
    nodes: ForceNodeDatum[],
    links: ForceLinks
  ): Simulation<ForceNodeDatum, ForceLinkDatum> {
    return forceSimulation(nodes)
      .force("link", links.distance(100))
      .force("charge", forceManyBody())
      .force("collide", forceCollide(50))
      .force("center", forceCenter().strength(0.05))
      .alphaMin(0.01)
  }

  private forceLayoutNodes(): ForceNodeDatum[] {
    return Object.entries(this.layouts).map(([id, v]) => ({ id, ...v }))
  }

  private forceLayoutLinks(): ForceLinkDatum[] {
    // d3-forceによってlink内のsource/targetがNodeDatumオブジェクトに
    // 置き換えられてしまうため、独自のリンクオブジェクトを構築する.
    return Object.values(this.links).map((v, index) => ({
      index,
      source: v.source,
      target: v.target,
    }))
  }
}
