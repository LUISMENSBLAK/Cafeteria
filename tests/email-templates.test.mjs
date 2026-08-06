import assert from 'node:assert/strict'
import test from 'node:test'

import { welcomeTemplate } from '../src/lib/email/templates.ts'

test('el correo incluye HTML responsive y texto plano equivalente', () => {
  const template = welcomeTemplate({
    email: 'contacto.muy.largo+administracion@cafeteria-ejemplo-muy-larga.com',
    nombreNegocio: 'Cafetería con un nombre comercial particularmente largo para móvil',
    nombreContacto: 'María Fernanda', password: 'Clave-Temporal-123',
    slug: 'cafeteria-ejemplo', trialTerminaEn: '2026-08-18T12:00:00.000Z',
  })
  assert.match(template.html, /max-width:600px/)
  assert.match(template.html, /overflow-wrap:anywhere/)
  assert.match(template.html, /min-height:48px/)
  assert.match(template.html, /prefers-color-scheme:dark/)
  assert.match(template.text, /Clave-Temporal-123/)
})

test('escapa contenido proporcionado por el tenant', () => {
  const template = welcomeTemplate({
    email: 'safe@example.com', nombreNegocio: '<script>alert(1)</script>',
    nombreContacto: '<b>Nombre</b>', password: 'abc123', slug: 'safe',
  })
  assert.doesNotMatch(template.html, /<script>alert/)
  assert.match(template.html, /&lt;script&gt;/)
})

