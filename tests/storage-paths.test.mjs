import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildProductAssetPath,
  extractProductAssetPath,
} from '../src/lib/storagePaths.ts'

test('crea rutas de Storage aisladas por tenant', () => {
  const tenantId = '2ba4825d-2360-4eee-9728-b4de43bc5978'
  assert.equal(
    buildProductAssetPath(tenantId, 'products', 'café principal.webp'),
    `${tenantId}/products/caf--principal.webp`,
  )
  assert.equal(
    buildProductAssetPath(null, 'logos', 'ticket.webp'),
    'legacy/logos/ticket.webp',
  )
})

test('recupera la ruta completa de una URL pública de Supabase', () => {
  const url = 'https://example.supabase.co/storage/v1/object/public/productos/tenant-1/products/prod.webp'
  assert.equal(
    extractProductAssetPath(url),
    'tenant-1/products/prod.webp',
  )
  assert.equal(extractProductAssetPath('https://example.com/logo.webp'), null)
})
