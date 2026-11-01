export function convertToAscii(source: string): string {
  return btoa(source).replace(/=/g, "")
}
