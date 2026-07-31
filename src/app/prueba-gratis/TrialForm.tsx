'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { createTrialTenant } from './actions'

export function TrialForm() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successData, setSuccessData] = useState<{
    slug: string;
    email: string;
    password: string;
  } | null>(null)
  const [copied, setCopied] = useState(false)

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
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-[var(--color-crema)]">
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
    <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl max-w-md w-full border border-[var(--color-crema)]">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-[var(--color-bronce)]">Comienza tu prueba</h2>
        <p className="text-[var(--color-gris)] mt-2">14 días gratis, todas las funciones.</p>
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
      </div>

      <Button 
        type="submit" 
        className="w-full mt-8" 
        disabled={loading}
      >
        {loading ? 'Creando tu cuenta...' : 'Crear mi cuenta gratis'}
      </Button>
      
      <p className="text-xs text-center text-[var(--color-gris)] mt-4">
        No se requiere tarjeta de crédito. Al crear tu cuenta aceptas nuestros términos y condiciones.
      </p>
    </form>
  )
}
