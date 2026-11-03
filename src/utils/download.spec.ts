import { afterEach, describe, expect, it, vi } from "vitest"
import { urlContentToDataUrl } from "./download"

class FailingFileReader {
  error = new Error("read failed")
  onerror: (() => void) | null = null
  readAsDataURL() {
    queueMicrotask(() => this.onerror?.())
  }
}

describe("download", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("should reject with the status when the response is not ok", async () => {
    vi.stubGlobal("fetch", async () => new Response("", { status: 404 }))
    await expect(urlContentToDataUrl("/image.svg")).rejects.toThrow("HTTP 404")
  })

  it("should reject with the reader's error when reading fails", async () => {
    vi.stubGlobal("fetch", async () => new Response("content"))
    vi.stubGlobal("FileReader", FailingFileReader)
    await expect(urlContentToDataUrl("/image.svg")).rejects.toThrow("read failed")
  })
})
