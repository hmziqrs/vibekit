export interface UploadResult {
  key: string
  url: string
}

export async function uploadImage(file: File): Promise<UploadResult> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch('/api/blog/upload', {
    body: formData,
    method: 'POST',
  })
  if (!res.ok) {
    const data = (await res.json()) as { error?: string }
    throw new Error(data.error ?? 'Upload failed')
  }
  const data = (await res.json()) as UploadResult
  return data
}
