/**
 * Serialize the rendered graph as indented SVG markup for snapshots.
 * The size of the root element and the transform of the viewport are
 * left out, since they follow the bounding box of the text and so
 * depend on the fonts installed.
 */
export function serializeGraph(container: Element): string {
  const svg = container.querySelector<SVGSVGElement>("svg.v-ng-canvas")
  if (!svg) throw new Error("The graph is not rendered")
  const target = svg.cloneNode(true) as SVGSVGElement
  const viewport = target.querySelector(".v-ng-viewport")
  viewport?.removeAttribute("transform")
  viewport?.removeAttribute("style")
  return serializeElement(target, 0).join("\n")
}

function serializeElement(element: Element, depth: number): string[] {
  const indent = "  ".repeat(depth)
  const tag = element.tagName
  const attrs = Array.from(element.attributes)
    // Scoped style ids of the fixtures follow their file paths.
    .filter(a => !a.name.startsWith("data-v-"))
    .map(a => ` ${a.name}="${a.value}"`)
    .join("")
  const children = Array.from(element.childNodes).flatMap(node => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      return serializeElement(node as Element, depth + 1)
    }
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim()
      return text ? [`${indent}  ${text}`] : []
    }
    return []
  })
  if (children.length === 0) {
    return [`${indent}<${tag}${attrs} />`]
  }
  return [`${indent}<${tag}${attrs}>`, ...children, `${indent}</${tag}>`]
}
