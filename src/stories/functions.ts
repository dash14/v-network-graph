import { StrokeStyle } from ".."

export function wrapSvg(element: string, className?: string): string {
  const classAttrs = `class="${className}" `
  return  `
    <svg ${classAttrs}xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
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
