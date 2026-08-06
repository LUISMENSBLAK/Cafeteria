import type { CSSProperties } from 'react'

export const TEMAS_DISPONIBLES = {
  cafe: {
    nombre: 'Café',
    theme_color_primario: '#F5E6D3',
    theme_color_secundario: '#7A5A32',
    theme_color_terciario: '#8C8880',
    theme_color_texto: '#111111',
  },
  blanco: {
    nombre: 'Blanco',
    theme_color_primario: '#FFFFFF',
    theme_color_secundario: '#1F2937',
    theme_color_terciario: '#9CA3AF',
    theme_color_texto: '#111827',
  },
  oscuro: {
    nombre: 'Oscuro',
    theme_color_primario: '#111827',
    theme_color_secundario: '#D9A441',
    theme_color_terciario: '#6B7280',
    theme_color_texto: '#F9FAFB',
  },
} as const

export type TemaKey = keyof typeof TEMAS_DISPONIBLES

type ThemeColorRecord = Partial<Record<
  'theme_color_primario' | 'theme_color_secundario' | 'theme_color_terciario' | 'theme_color_texto',
  unknown
>>

export function detectThemeKey(value: ThemeColorRecord): TemaKey | null {
  const normalize = (color: unknown) => String(color ?? '').trim().toUpperCase()

  for (const [key, theme] of Object.entries(TEMAS_DISPONIBLES) as [TemaKey, (typeof TEMAS_DISPONIBLES)[TemaKey]][]) {
    if (
      normalize(value.theme_color_primario) === normalize(theme.theme_color_primario) &&
      normalize(value.theme_color_secundario) === normalize(theme.theme_color_secundario) &&
      normalize(value.theme_color_terciario) === normalize(theme.theme_color_terciario) &&
      normalize(value.theme_color_texto) === normalize(theme.theme_color_texto)
    ) {
      return key
    }
  }

  return null
}

export function getContrastingTextColor(background: string) {
  const normalized = background.replace('#', '')
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return '#FFFFFF'
  const channels = [0, 2, 4].map((index) => Number.parseInt(normalized.slice(index, index + 2), 16) / 255)
  const [red, green, blue] = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  )
  const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue
  const whiteContrast = 1.05 / (luminance + 0.05)
  const darkContrast = (luminance + 0.05) / 0.05
  return whiteContrast >= darkContrast ? '#FFFFFF' : '#111111'
}

type PosThemeStyle = CSSProperties & Record<`--${string}`, string>

/**
 * Mantiene el color de marca en fondos de marca, pero evita que el texto claro
 * del tema oscuro se herede dentro de tarjetas, formularios y tablas blancas.
 */
export function getPosThemeStyle(primary: string, secondary: string, tertiary: string): PosThemeStyle {
  return {
    '--color-negro': '#111827',
    '--color-gris': '#5B6472',
    '--color-en-crema': getContrastingTextColor(primary),
    // El acento secundario es una superficie de marca (navegación activa,
    // botones y banner de prueba). Su contenido debe permanecer claro y no
    // heredar el negro funcional usado dentro de tarjetas y formularios.
    '--color-en-bronce': '#FFFFFF',
    '--color-en-gris': getContrastingTextColor(tertiary),
    color: '#111827',
  }
}
