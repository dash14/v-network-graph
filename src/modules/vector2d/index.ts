export { Vector2D } from "./vector2d"
export * from "./methods"

import * as V from "./methods"
import { Vector2D } from "./vector2d"

export default {
  Vector2D,
  ...V,
}
