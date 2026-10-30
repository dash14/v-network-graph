export async function urlContentToDataUrl(url: string) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
  const blob = await response.blob()
  return new Promise<string>((onSuccess, onError) => {
    try {
      const reader = new FileReader()
      reader.onload = function () {
        onSuccess(this.result as string)
      }
      reader.readAsDataURL(blob)
    } catch (e) {
      onError(e)
    }
  })
}
