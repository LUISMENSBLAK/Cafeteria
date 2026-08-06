import assert from 'node:assert/strict'
import test from 'node:test'

import { detectThemeKey, TEMAS_DISPONIBLES } from '../src/lib/themes.ts'

test('reconoce cada preset por sus cuatro colores', () => {
  for (const [key, theme] of Object.entries(TEMAS_DISPONIBLES)) {
    assert.equal(detectThemeKey(theme), key)
  }
})

test('reconoce colores aunque la capitalización sea distinta', () => {
  const darkTheme = TEMAS_DISPONIBLES.oscuro
  assert.equal(detectThemeKey({
    theme_color_primario: darkTheme.theme_color_primario.toLowerCase(),
    theme_color_secundario: darkTheme.theme_color_secundario.toLowerCase(),
    theme_color_terciario: darkTheme.theme_color_terciario.toLowerCase(),
    theme_color_texto: darkTheme.theme_color_texto.toLowerCase(),
  }), 'oscuro')
})

test('conserva una combinación personalizada sin asignarle otro preset', () => {
  assert.equal(detectThemeKey({
    theme_color_primario: '#123456',
    theme_color_secundario: '#654321',
    theme_color_terciario: '#888888',
    theme_color_texto: '#FFFFFF',
  }), null)
})
