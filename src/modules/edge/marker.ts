import { Config, EdgeConfig, MarkerStyle, StrokeStyle } from "@/common/configs"
import { Edges } from "@/common/types"

/**
 * The marker that the edges put at an end of their summarized line: the first one that is not
 * "none", or that of the first edge.
 * @param marker the marker config of the edges
 * @param edges the summarized edges
 * @param stroke the stroke of the summarized line
 * @param end the end of the line, where the source is that of the first edge
 * @returns the marker
 */
export function summarizedMarkerOf(
  marker: EdgeConfig["marker"],
  edges: Edges,
  stroke: StrokeStyle,
  end: "source" | "target"
): MarkerStyle {
  const all = Object.values(edges)
  let first: MarkerStyle | undefined
  for (const edge of all) {
    // A reversed edge puts its marker of the other end here.
    const reversed = edge.source !== all[0].source
    const key = reversed ? (end === "source" ? "target" : "source") : end
    const m = Config.values(marker[key], [edge, stroke])
    if (m.type !== "none") return m
    first ??= m
  }
  return first!
}
