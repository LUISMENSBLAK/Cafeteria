'use client'

import { useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Clipboard,
  Coffee,
  Eye,
  EyeOff,
  FileImage,
  LoaderCircle,
  LockKeyhole,
  Mail,
  Palette,
  RefreshCw,
  Trash2,
  UploadCloud,
  UserRound,
} from 'lucide-react'

import { TEMAS_DISPONIBLES, type TemaKey } from '@/lib/themes'
import { createTrialTenant } from './actions'

const fieldClass =
  'mt-2 h-12 w-full rounded-xl border border-stone-300 bg-white px-4 text-base text-stone-950 outline-none transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-stone-400 hover:border-stone-400 focus:border-amber-700 focus:ring-4 focus:ring-amber-700/10 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-500 motion-reduce:transition-none'

const allowedLogoTypes = new Set(['image/png', 'image/jpeg', 'image/webp'])
const maxLogoBytes = 5 * 1024 * 1024

function ThemeThumbnail({ themeKey, selected }: { themeKey: TemaKey; selected: boolean }) {
  const theme = TEMAS_DISPONIBLES[themeKey]
  return (
    <div
      className="relative h-20 overflow-hidden rounded-lg border border-black/10 p-2"
      style={{ backgroundColor: theme.theme_color_primario, color: theme.theme_color_texto }}
    >
      <div className="mb-2 flex h-3 items-center justify-between rounded-sm px-1.5" style={{ backgroundColor: theme.theme_color_secundario }}>
        <span className="h-1 w-5 rounded-full bg-white/80" />
        <span className="size-1.5 rounded-full bg-white/80" />
      </div>
      <div className="grid grid-cols-[1.2fr_.7fr] gap-1.5">
        <div className="space-y-1">
          <div className="h-2.5 rounded-sm border border-black/10 bg-white/65" />
          <div className="h-2.5 w-4/5 rounded-sm border border-black/10 bg-white/55" />
          <div className="h-2.5 w-2/3 rounded-sm" style={{ backgroundColor: theme.theme_color_terciario }} />
        </div>
        <div className="rounded-sm border border-black/10 bg-white/80 p-1">
          <div className="h-1.5 rounded-full bg-black/15" />
          <div className="mt-2 h-2 rounded-sm" style={{ backgroundColor: theme.theme_color_secundario }} />
        </div>
      </div>
      {selected && (
        <span className="absolute right-1.5 top-1.5 grid size-5 place-items-center rounded-full bg-white text-stone-950 shadow-md">
          <Check size={13} strokeWidth={3} aria-hidden="true" />
        </span>
      )}
    </div>
  )
}

function LoginPreview({
  businessName,
  logoPreview,
  themeKey,
}: {
  businessName: string
  logoPreview: string | null
  themeKey: TemaKey
}) {
  const theme = TEMAS_DISPONIBLES[themeKey]
  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-stone-100 p-3 shadow-inner">
      <div className="mb-3 flex items-center justify-between px-1 text-xs font-semibold text-stone-500">
        <span>Vista previa del acceso</span>
        <span className="inline-flex items-center gap-1"><Eye size={13} /> En vivo</span>
      </div>
      <div
        className="relative min-h-64 overflow-hidden rounded-xl border border-black/10 p-5 transition-colors duration-300 motion-reduce:transition-none"
        style={{ backgroundColor: theme.theme_color_primario, color: theme.theme_color_texto }}
      >
        <div className="absolute -right-8 -top-8 size-28 rounded-full opacity-10" style={{ backgroundColor: theme.theme_color_secundario }} />
        <div className="relative mx-auto max-w-[250px] rounded-xl border border-black/10 bg-white p-5 text-center shadow-[0_14px_34px_rgba(0,0,0,.13)]">
          <div className="mx-auto grid min-h-14 place-items-center rounded-lg border border-stone-200 bg-stone-50 px-3">
            {logoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoPreview} alt="Vista previa del logo" className="max-h-11 max-w-full object-contain" />
            ) : (
              <Coffee size={28} style={{ color: theme.theme_color_secundario }} aria-hidden="true" />
            )}
          </div>
          <div className="mt-3 truncate text-sm font-extrabold text-stone-900">{businessName.trim() || 'Tu cafetería'}</div>
          <div className="mt-1 text-[10px] font-medium text-stone-500">Sistema Punto de Venta</div>
          <div className="mt-4 space-y-2">
            <div className="h-8 rounded-md border border-stone-200 bg-stone-50" />
            <div className="h-8 rounded-md border border-stone-200 bg-stone-50" />
            <div className="h-9 rounded-md text-[10px] font-bold leading-9 text-white" style={{ backgroundColor: theme.theme_color_secundario }}>
              Entrar al POS
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function TrialForm() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [businessName, setBusinessName] = useState('')
  const [successData, setSuccessData] = useState<{
    slug: string
    email: string
    password: string
    businessName: string
  } | null>(null)
  const [copied, setCopied] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [themeKey, setThemeKey] = useState<TemaKey>('cafe')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoError, setLogoError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const errorRef = useRef<HTMLDivElement>(null)

  useEffect(() => () => {
    if (logoPreview) URL.revokeObjectURL(logoPreview)
  }, [logoPreview])

  useEffect(() => {
    if (!error) return
    errorRef.current?.focus()
    errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [error])

  const selectLogo = (file: File | null) => {
    if (!file) return
    if (!allowedLogoTypes.has(file.type)) {
      setLogoError('Selecciona un archivo PNG, JPG, JPEG o WebP.')
      return
    }
    if (file.size > maxLogoBytes) {
      setLogoError('La imagen no puede pesar más de 5 MB.')
      return
    }
    setLogoError(null)
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  const removeLogo = () => {
    if (logoPreview) URL.revokeObjectURL(logoPreview)
    setLogoFile(null)
    setLogoPreview(null)
    setLogoError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (loading || logoError) return
    setLoading(true)
    setError(null)

    try {
      const formData = new FormData(event.currentTarget)
      const result = await createTrialTenant(formData)
      if (result.success && result.slug && result.email && result.password) {
        setSuccessData({
          slug: result.slug,
          email: result.email,
          password: result.password,
          businessName: businessName.trim(),
        })
      } else {
        setError(result.error || 'Ocurrió un error inesperado al registrar el negocio.')
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const copyCredentials = async () => {
    if (!successData) return
    const loginUrl = `${window.location.origin}/demo/${successData.slug}/login`
    const text = `Acceso a POS: ${loginUrl}\nUsuario: ${successData.email}\nContraseña: ${successData.password}`
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2500)
    } catch {
      setError('No pudimos copiar automáticamente. Selecciona los datos y cópialos manualmente.')
    }
  }

  if (successData) {
    const loginUrl = `/demo/${successData.slug}/login`
    return (
      <div className="relative overflow-hidden rounded-[28px] border border-emerald-900/10 bg-white p-5 shadow-[0_24px_80px_rgba(28,25,23,.12)] sm:p-8 lg:p-10">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-emerald-600" />
        <div className="mx-auto max-w-xl text-center">
          <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-emerald-100 text-emerald-800 shadow-[0_10px_25px_rgba(5,150,105,.15)]">
            <CheckCircle2 size={34} strokeWidth={2} aria-hidden="true" />
          </div>
          <p className="mt-5 text-sm font-bold text-emerald-800">Registro completado</p>
          <h2 className="mt-2 text-3xl font-black tracking-[-.035em] text-stone-950">Tu punto de venta está listo</h2>
          <p className="mt-3 text-base leading-7 text-stone-600">
            {successData.businessName ? <><strong className="text-stone-900">{successData.businessName}</strong> ya tiene su propio espacio. </> : null}
            Enviamos estas credenciales a tu correo y tu prueba estará activa durante 14 días.
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-stone-200 bg-stone-50 p-4 sm:p-5">
          <div className="flex items-center gap-2 text-sm font-bold text-stone-900">
            <LockKeyhole size={17} className="text-amber-800" aria-hidden="true" /> Tus datos de acceso
          </div>
          <dl className="mt-4 space-y-3">
            <div className="rounded-xl border border-stone-200 bg-white p-3.5">
              <dt className="text-xs font-bold text-stone-500">URL de acceso</dt>
              <dd className="mt-1 break-all text-sm font-semibold text-stone-900">{`${typeof window !== 'undefined' ? window.location.origin : ''}${loginUrl}`}</dd>
            </div>
            <div className="rounded-xl border border-stone-200 bg-white p-3.5">
              <dt className="text-xs font-bold text-stone-500">Correo</dt>
              <dd className="mt-1 break-all text-sm font-semibold text-stone-900">{successData.email}</dd>
            </div>
            <div className="rounded-xl border border-stone-200 bg-white p-3.5">
              <dt className="text-xs font-bold text-stone-500">Contraseña temporal</dt>
              <dd className="mt-1 flex items-center justify-between gap-3">
                <span className="min-w-0 break-all font-mono text-sm font-bold text-stone-900">{showPassword ? successData.password : '••••••••••••••••'}</span>
                <button type="button" onClick={() => setShowPassword((value) => !value)} className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-lg text-stone-600 outline-none transition-colors hover:bg-stone-100 hover:text-stone-950 focus-visible:ring-2 focus-visible:ring-amber-700 motion-reduce:transition-none" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </dd>
            </div>
          </dl>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={copyCredentials} className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-5 text-sm font-bold text-stone-800 outline-none transition-[background-color,border-color,transform] duration-200 hover:border-stone-400 hover:bg-stone-50 active:scale-[.98] focus-visible:ring-4 focus-visible:ring-amber-700/20 motion-reduce:transform-none motion-reduce:transition-none">
            {copied ? <Check size={18} className="text-emerald-700" /> : <Clipboard size={18} />}
            {copied ? 'Credenciales copiadas' : 'Copiar credenciales'}
          </button>
          <a href={loginUrl} className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-stone-900 px-5 text-sm font-bold text-white shadow-lg shadow-stone-900/15 outline-none transition-[background-color,transform,box-shadow] duration-200 hover:bg-amber-800 hover:shadow-amber-900/20 active:scale-[.98] focus-visible:ring-4 focus-visible:ring-amber-700/30 motion-reduce:transform-none motion-reduce:transition-none">
            Entrar a mi POS <ArrowRight size={18} />
          </a>
        </div>
        <p className="mt-5 text-center text-xs leading-5 text-stone-500">Guarda estas credenciales en un lugar privado. Si necesitas ayuda, Innova Network puede acompañarte durante la configuración.</p>
        <p className="sr-only" aria-live="polite">{copied ? 'Las credenciales se copiaron al portapapeles.' : ''}</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="relative overflow-hidden rounded-[28px] border border-stone-200 bg-white shadow-[0_24px_80px_rgba(28,25,23,.12),0_2px_12px_rgba(28,25,23,.05)]">
      <div className="border-b border-stone-200 bg-stone-50/80 p-5 sm:p-7 lg:p-8">
        <p className="text-sm font-bold text-amber-800">Prueba gratuita de 14 días</p>
        <h2 className="mt-2 text-2xl font-black tracking-[-.03em] text-stone-950 sm:text-3xl">Crea el espacio de tu negocio</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">Completa tus datos, elige el estilo y recibe acceso inmediato. No necesitas tarjeta.</p>
        <ol className="mt-5 grid grid-cols-3 gap-2" aria-label="Etapas del registro">
          {['Tu negocio', 'Personalización', 'Acceso'].map((step, index) => (
            <li key={step} className="flex min-w-0 items-center gap-2">
              <span className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-black ${index === 0 ? 'bg-stone-900 text-white' : 'border border-stone-300 bg-white text-stone-600'}`}>{index + 1}</span>
              <span className="hidden truncate text-xs font-bold text-stone-600 sm:block">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="space-y-8 p-5 sm:p-7 lg:p-8">
        {error && (
          <div ref={errorRef} tabIndex={-1} role="alert" className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-5 text-red-900 outline-none focus:ring-2 focus:ring-red-700">
            <AlertCircle size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
            <div><strong className="block">No pudimos completar el registro</strong><span className="mt-1 block text-red-800">{error}</span></div>
          </div>
        )}

        <fieldset disabled={loading} className="space-y-5">
          <legend className="flex items-center gap-3 text-lg font-black text-stone-950">
            <span className="grid size-9 place-items-center rounded-lg bg-amber-100 text-amber-800"><Building2 size={19} /></span>
            Tu negocio
          </legend>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="nombreNegocio" className="text-sm font-bold text-stone-800">Nombre del negocio <span className="text-red-700" aria-hidden="true">*</span></label>
              <input id="nombreNegocio" name="nombreNegocio" required autoComplete="organization" value={businessName} onChange={(event) => setBusinessName(event.target.value)} placeholder="Ej. Café La Estación" className={fieldClass} />
            </div>
            <div>
              <label htmlFor="nombreContacto" className="text-sm font-bold text-stone-800">Nombre completo <span className="text-red-700" aria-hidden="true">*</span></label>
              <div className="relative"><UserRound size={18} className="pointer-events-none absolute left-4 top-[25px] text-stone-400" /><input id="nombreContacto" name="nombreContacto" required autoComplete="name" placeholder="Juan Pérez" className={`${fieldClass} pl-11`} /></div>
            </div>
            <div>
              <label htmlFor="emailContacto" className="text-sm font-bold text-stone-800">Correo electrónico <span className="text-red-700" aria-hidden="true">*</span></label>
              <div className="relative"><Mail size={18} className="pointer-events-none absolute left-4 top-[25px] text-stone-400" /><input id="emailContacto" name="emailContacto" type="email" required autoComplete="email" inputMode="email" placeholder="tu@cafeteria.com" className={`${fieldClass} pl-11`} /></div>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="telefonoContacto" className="text-sm font-bold text-stone-800">Teléfono <span className="font-medium text-stone-500">(opcional)</span></label>
              <input id="telefonoContacto" name="telefonoContacto" type="tel" autoComplete="tel" inputMode="tel" placeholder="Para soporte y seguimiento" className={fieldClass} />
            </div>
          </div>
        </fieldset>

        <div className="h-px bg-stone-200" />

        <fieldset disabled={loading} className="space-y-6">
          <legend className="flex items-center gap-3 text-lg font-black text-stone-950">
            <span className="grid size-9 place-items-center rounded-lg bg-amber-100 text-amber-800"><Palette size={19} /></span>
            Personaliza tu POS
          </legend>

          <div>
            <label htmlFor="logo-input" className="text-sm font-bold text-stone-800">Logo del negocio <span className="font-medium text-stone-500">(opcional)</span></label>
            <div className={`mt-2 rounded-2xl border-2 border-dashed p-4 transition-[border-color,background-color] duration-200 ${logoError ? 'border-red-300 bg-red-50/50' : logoFile ? 'border-emerald-300 bg-emerald-50/40' : 'border-stone-300 bg-stone-50 hover:border-amber-600/60 hover:bg-amber-50/30'} motion-reduce:transition-none`}>
              <input ref={fileInputRef} id="logo-input" type="file" name="logo" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => selectLogo(event.target.files?.[0] ?? null)} />
              <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
                <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-stone-200 bg-white text-amber-800 shadow-sm">
                  {logoPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoPreview} alt="Logo seleccionado" className="size-full object-contain p-1" />
                  ) : <UploadCloud size={25} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-stone-900">{logoFile?.name || 'Agrega tu logo cuando quieras'}</p>
                  <p className="mt-1 text-xs leading-5 text-stone-500">PNG, JPG, JPEG o WebP · máximo 5 MB</p>
                </div>
                <div className="flex gap-2">
                  <label htmlFor="logo-input" className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 text-xs font-bold text-stone-800 outline-none transition-colors hover:border-amber-700 hover:text-amber-800 focus-within:ring-2 focus-within:ring-amber-700">
                    {logoFile ? <RefreshCw size={15} /> : <FileImage size={15} />}{logoFile ? 'Reemplazar' : 'Elegir archivo'}
                  </label>
                  {logoFile && <button type="button" onClick={removeLogo} className="grid size-11 cursor-pointer place-items-center rounded-lg border border-stone-300 bg-white text-stone-600 outline-none transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-800 focus-visible:ring-2 focus-visible:ring-red-700" aria-label="Retirar logo"><Trash2 size={17} /></button>}
                </div>
              </div>
            </div>
            {logoError && <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-red-800" role="alert"><AlertCircle size={15} />{logoError}</p>}
            <p className="mt-2 text-xs leading-5 text-stone-500">El archivo se envía únicamente cuando creas la prueba.</p>
          </div>

          <div>
            <span id="theme-label" className="text-sm font-bold text-stone-800">Elige el estilo del POS</span>
            <div className="mt-2 grid grid-cols-3 gap-2 sm:gap-3" role="radiogroup" aria-labelledby="theme-label">
              {(Object.keys(TEMAS_DISPONIBLES) as TemaKey[]).map((key) => {
                const selected = themeKey === key
                return (
                  <button key={key} type="button" role="radio" aria-checked={selected} onClick={() => setThemeKey(key)} className={`min-w-0 cursor-pointer rounded-xl border-2 p-2 text-left outline-none transition-[border-color,box-shadow,transform,background-color] duration-200 hover:-translate-y-0.5 active:scale-[.98] focus-visible:ring-4 focus-visible:ring-amber-700/20 ${selected ? 'border-amber-700 bg-amber-50 shadow-[0_8px_20px_rgba(161,98,7,.10)]' : 'border-stone-200 bg-white hover:border-stone-300'} motion-reduce:transform-none motion-reduce:transition-none`}>
                    <ThemeThumbnail themeKey={key} selected={selected} />
                    <span className="mt-2 block truncate text-center text-xs font-bold text-stone-800">{TEMAS_DISPONIBLES[key].nombre}</span>
                  </button>
                )
              })}
            </div>
            <input type="hidden" name="tema" value={themeKey} />
          </div>

          <LoginPreview businessName={businessName} logoPreview={logoPreview} themeKey={themeKey} />
        </fieldset>

        <button type="submit" disabled={loading || Boolean(logoError)} className="inline-flex min-h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-stone-900 px-6 text-base font-extrabold text-white shadow-[0_12px_30px_rgba(28,25,23,.20)] outline-none transition-[background-color,box-shadow,transform] duration-200 hover:bg-amber-800 hover:shadow-[0_14px_32px_rgba(133,77,14,.24)] active:scale-[.99] focus-visible:ring-4 focus-visible:ring-amber-700/30 disabled:cursor-not-allowed disabled:bg-stone-400 disabled:shadow-none motion-reduce:transform-none motion-reduce:transition-none">
          {loading ? <><LoaderCircle size={20} className="animate-spin motion-reduce:animate-none" />Preparando tu punto de venta…</> : <>Crear mi prueba gratuita <ArrowRight size={20} /></>}
        </button>
        <p className="text-center text-xs leading-5 text-stone-500">No necesitas tarjeta. Al crear tu prueba confirmas que los datos pertenecen a tu negocio y que podemos enviarte información transaccional de acceso.</p>
      </div>
    </form>
  )
}
