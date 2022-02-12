
export class MapUtil {
  static valueOf<K, V>(map: Map<K, V>) {
    return Array.from(map.values())
  }
}
