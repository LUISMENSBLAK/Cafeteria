'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { createTrialTenant } from './actions'
import { TEMAS_DISPONIBLES } from '@/lib/themes'
import type { TemaKey } from '@/lib/themes'

export function TrialForm() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successData, setSuccessData] = useState<{
    slug: string;
    email: string;
    password: string;
  } | null>(null)
  const [copied, setCopied] = useState(false)
  const [temaElegido, setTemaElegido] = useState<TemaKey>('cafe')
  const [logoError, setLogoError] = useState<string | null>(null)
  const [logoName, setLogoName] = useState<string | null>(null)

  // Aplica el tema a nivel global (<html>) para que cubra toda la página
  useEffect(() => {
    const tema = TEMAS_DISPONIBLES[temaElegido]
    const root = document.documentElement
    root.style.setProperty('--color-crema', tema.theme_color_primario)
    root.style.setProperty('--color-bronce', tema.theme_color_secundario)
    root.style.setProperty('--color-gris', tema.theme_color_terciario)
    root.style.setProperty('--color-negro', tema.theme_color_texto)

    return () => {
      root.style.removeProperty('--color-crema')
      root.style.removeProperty('--color-bronce')
      root.style.removeProperty('--color-gris')
      root.style.removeProperty('--color-negro')
    }
  }, [temaElegido])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    try {
      const formData = new FormData(e.currentTarget)
      const result = await createTrialTenant(formData)
      
      if (result.success && result.slug && result.email && result.password) {
        setSuccessData({
          slug: result.slug,
          email: result.email,
          password: result.password
        })
      } else {
        setError(result.error || 'Ocurrió un error inesperado al registrar el negocio.')
      }
    } catch (err: any) {
      setError(err.message || 'Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const copyCredentials = () => {
    if (!successData) return
    const text = `Acceso a POS: ${window.location.origin}/demo/${successData.slug}/login\nUsuario: ${successData.email}\nContraseña: ${successData.password}`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (successData) {
    const loginUrl = `/demo/${successData.slug}/login`
    
    return (
      <div className="bg-[var(--color-crema)] p-8 rounded-2xl shadow-xl max-w-lg w-full border border-[var(--color-bronce)]">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
            ✓
          </div>
          <h2 className="text-2xl font-bold text-[var(--color-bronce)] mb-2">¡Prueba Activada!</h2>
          <p className="text-[var(--color-gris)]">
            Tu POS ya está listo. También te hemos enviado un correo de bienvenida.
          </p>
        </div>

        <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl mb-6 space-y-3">
          <p className="text-sm font-semibold text-orange-800 mb-2">Tus datos de acceso temporales:</p>
          <div>
            <span className="text-xs text-orange-600 uppercase font-bold tracking-wider">Correo</span>
            <p className="font-mono text-sm bg-white p-2 border border-orange-200 rounded mt-1">{successData.email}</p>
          </div>
          <div>
            <span className="text-xs text-orange-600 uppercase font-bold tracking-wider">Contraseña</span>
            <p className="font-mono text-sm bg-white p-2 border border-orange-200 rounded mt-1 break-all">{successData.password}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Button onClick={copyCredentials} variant="outline" className="w-full">
            {copied ? '¡Copiado!' : 'Copiar datos de acceso'}
          </Button>
          <a href={loginUrl} className="w-full">
            <Button className="w-full">
              Ir a mi POS ahora
            </Button>
          </a>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-[var(--color-crema)] p-8 sm:p-10 rounded-2xl shadow-xl max-w-lg w-full border border-[var(--color-bronce)]/20 transition-colors duration-300">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-[var(--color-bronce)]">Comienza tu prueba</h2>
        <p className="text-[var(--color-negro)] mt-2">14 días gratis, todas las funciones.</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm mb-6 border border-red-200">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="nombreNegocio" className="block text-sm font-semibold text-[var(--color-bronce)] mb-1">
            Nombre de tu Negocio *
          </label>
          <Input 
            id="nombreNegocio" 
            name="nombreNegocio" 
            required 
            placeholder="Ej. Café La Estación"
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="nombreContacto" className="block text-sm font-semibold text-[var(--color-bronce)] mb-1">
            Tu Nombre Completo *
          </label>
          <Input 
            id="nombreContacto" 
            name="nombreContacto" 
            required 
            placeholder="Ej. Juan Pérez"
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="emailContacto" className="block text-sm font-semibold text-[var(--color-bronce)] mb-1">
            Correo Electrónico *
          </label>
          <Input 
            id="emailContacto" 
            name="emailContacto" 
            type="email" 
            required 
            placeholder="tucorreo@ejemplo.com"
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="telefonoContacto" className="block text-sm font-semibold text-[var(--color-bronce)] mb-1">
            Teléfono (Opcional)
          </label>
          <Input 
            id="telefonoContacto" 
            name="telefonoContacto" 
            type="tel" 
            placeholder="Para soporte y seguimiento"
            disabled={loading}
          />
        </div>

        {/* Logo opcional — botón personalizado para evitar el widget nativo del navegador */}
        <div>
          <label className="block text-sm font-semibold text-[var(--color-negro)] mb-2">
            Logo de tu negocio (opcional)
          </label>
          <div className="flex items-center gap-3">
            <label
              htmlFor="logo-input"
              className={`cursor-pointer bg-[var(--color-crema)] border border-[var(--color-gris)] text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-80 transition-opacity whitespace-nowrap ${temaElegido === 'oscuro' ? 'text-[var(--color-negro)]' : 'text-white'}`}
            >
              Elegir archivo
            </label>
            <input
              id="logo-input"
              type="file"
              name="logo"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file && file.size > 5 * 1024 * 1024) {
                  setLogoError('La imagen no puede pesar más de 5MB.')
                  e.target.value = ''
                  setLogoName(null)
                } else {
                  setLogoError(null)
                  setLogoName(file ? file.name : null)
                }
              }}
            />
            <span className="text-sm text-[var(--color-negro)] truncate">
              {logoName || 'Ningún archivo seleccionado'}
            </span>
          </div>
          {logoError && <p className="text-red-600 text-xs mt-1">{logoError}</p>}
          <p className="text-xs text-[var(--color-gris)] mt-1">Puedes agregarlo después si no lo tienes a la mano.</p>
        </div>

        {/* Selector de tema */}
        <div>
          <label className="block text-sm font-semibold text-[var(--color-negro)] mb-2">
            Elige el estilo de tu POS
          </label>
          <div className="grid grid-cols-3 gap-3">
            {(Object.keys(TEMAS_DISPONIBLES) as Array<TemaKey>).map(key => {
              const tema = TEMAS_DISPONIBLES[key]
              const seleccionado = temaElegido === key
              return (
                <button
                  type="button"
                  key={key}
                  onClick={() => setTemaElegido(key)}
                  className={`rounded-xl border-2 p-3 text-center transition-all ${
                    seleccionado ? 'border-[var(--color-bronce)]' : 'border-[var(--color-gris)] opacity-60'
                  }`}
                >
                  <div className="flex h-10 rounded-lg overflow-hidden mb-2">
                    <div className="w-1/2" style={{ backgroundColor: tema.theme_color_primario }} />
                    <div className="w-1/2" style={{ backgroundColor: tema.theme_color_secundario }} />
                  </div>
                  <span className="text-xs font-semibold">{tema.nombre}</span>
                </button>
              )
            })}
          </div>
          <input type="hidden" name="tema" value={temaElegido} />
          <p className="text-xs text-[var(--color-negro)] mt-2">Podrás cambiarlo después desde tu panel de administración.</p>
        </div>
      </div>

      <Button 
        type="submit" 
        className="w-full mt-8" 
        disabled={loading}
      >
        {loading ? 'Creando tu cuenta...' : 'Crear mi cuenta gratis'}
      </Button>
      
      <p className="text-xs text-center text-[var(--color-negro)] mt-4">
        No se requiere tarjeta de crédito. Al crear tu cuenta aceptas nuestros términos y condiciones.
      </p>
    </form>
  )
}
