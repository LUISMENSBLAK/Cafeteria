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
