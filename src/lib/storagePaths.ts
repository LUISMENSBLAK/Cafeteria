const STORAGE_BUCKET = 'productos'

export type ProductAssetKind = 'products' | 'logos'

function safeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '-')
}

export function buildProductAssetPath(
  tenantId: string | null | undefined,
  kind: ProductAssetKind,
  fileName: string,
) {
  const ownerFolder = tenantId?.trim() || 'legacy'
  return `${ownerFolder}/${kind}/${safeFileName(fileName)}`
}

export function extractProductAssetPath(publicUrl: string | null | undefined) {
  if (!publicUrl) return null

  try {
    const url = new URL(publicUrl)
    const marker = `/storage/v1/object/public/${STORAGE_BUCKET}/`
    const markerIndex = url.pathname.indexOf(marker)
    if (markerIndex === -1) return null
    return decodeURIComponent(url.pathname.slice(markerIndex + marker.length)) || null
  } catch {
    return null
  }
}
