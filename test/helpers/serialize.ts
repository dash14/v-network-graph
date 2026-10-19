export interface SerializeOptions {
  /** Sort the attributes by name, since their order follows when they were set. */
  sortAttributes?: boolean
  /** Keep the pan of the viewport, which depends on the installed fonts. */
  pan?: boolean
}

/**
 * Serialize the rendered graph as indented SVG markup for snapshots.
 * The pan of the viewport is left out unless `pan` is set, since it
 * follows the bounding box of the text and so depends on the installed fonts.
 */
export function serializeGraph(container: Element, options: SerializeOptions = {}): string {
  const svg = container.querySelector<SVGSVGElement>("svg.v-ng-canvas")
  if (!svg) throw new Error("The graph is not rendered")
  const target = svg.cloneNode(true) as SVGSVGElement
  const viewport = target.querySelector(".v-ng-viewport")
  viewport?.removeAttribute("style")
  if (!options.pan) {
    const zoom = svg.querySelector<SVGGElement>(".v-ng-viewport")?.transform.baseVal.consolidate()
    if (zoom) {
      const { a, b, c, d } = zoom.matrix
      viewport?.setAttribute("transform", `matrix(${a} ${b} ${c} ${d} 0 0)`)
    } else {
      viewport?.removeAttribute("transform")
    }
  }
  return serializeElement(target, 0, options).join("\n")
}

function serializeElement(element: Element, depth: number, options: SerializeOptions): string[] {
  const indent = "  ".repeat(depth)
  const tag = element.tagName
  const attributes = Array.from(element.attributes)
  if (options.sortAttributes) attributes.sort((a, b) => a.name.localeCompare(b.name))
  const attrs = attributes
    // Scoped style ids of the fixtures follow their file paths.
    .filter(a => !a.name.startsWith("data-v-"))
    .map(a => ` ${a.name}="${escapeXml(a.value)}"`)
    .join("")
  const children = Array.from(element.childNodes).flatMap(node => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      return serializeElement(node as Element, depth + 1, options)
    }
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim()
      return text ? [`${indent}  ${escapeXml(text)}`] : []
    }
    return []
  })
  if (children.length === 0) {
    return [`${indent}<${tag}${attrs} />`]
  }
  return [`${indent}<${tag}${attrs}>`, ...children, `${indent}</${tag}>`]
}

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;")
}
