export function convertToAscii(source: string): string {
  if (typeof btoa === "undefined") {
    return Buffer.from(source).toString("base64").replace(/=/g, "")
  } else {
    return btoa(source).replace(/=/g, "")
  }
}
