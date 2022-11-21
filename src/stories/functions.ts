import { StrokeStyle } from ".."

export function wrapSvg(element: string, className?: string): string {
  const classAttrs = `class="${className}" `
  return  `
    <svg ${classAttrs}>
      ${element}
    </svg>`
}

function configWithDefaults<T extends object>(defaultValues: T, assign: Partial<T>): T {
  return Object.assign({ ...defaultValues }, assign)
}

export function strokeStyleWithDefaults(style: Partial<StrokeStyle> = {}): StrokeStyle {
  return configWithDefaults({
    width: 1,
    color: "#000",
    dasharray: "0",
    linecap: "butt",
    animate: false,
    animationSpeed: 40,
  }, style)
}
