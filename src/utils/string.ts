
export function convertToAscii(source: string): string {
  if (typeof btoa === undefined) {
    return Buffer.from(source).toString("base64").replaceAll("=", "")
  } else {
    return btoa(source).replaceAll("=", "")
  }
}
