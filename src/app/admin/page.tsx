import { createClient } from '@/utils/supabase/server'
import AdminView from './AdminView'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { HeaderBrand } from '@/components/HeaderBrand'
import { getPosThemeStyle } from '@/lib/themes'

export default async function AdminPage() {
  const headersList = await headers()
  const headerId = headersList.get('x-employee-id')
  const headerNombre = headersList.get('x-employee-nombre')
  const headerRol = headersList.get('x-employee-rol')
  const rawBusinessName = headersList.get('x-business-name')
  const rawLogoUrl = headersList.get('x-logo-url')
  const tenantSlug = headersList.get('x-tenant-slug') ?? ''
  const posThemeStyle = getPosThemeStyle(
    headersList.get('x-theme-primario') ?? '#F5E6D3',
    headersList.get('x-theme-secundario') ?? '#7A5A32',
    headersList.get('x-theme-terciario') ?? '#8C8880',
  )
  const businessName = rawBusinessName ? decodeURIComponent(rawBusinessName) : 'Innova Coffee POS'
  const logoUrl = rawLogoUrl ? decodeURIComponent(rawLogoUrl) : ''

  let employee: { id: string; nombre: string; rol: string }
  const supabase = await createClient()

  if (headerId && headerNombre && headerRol) {
    employee = { id: headerId, nombre: decodeURIComponent(headerNombre), rol: headerRol }
  } else {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data } = await supabase
      .from('employees')
      .select('id, nombre, rol')
      .eq('id', user.id)
      .single()

    if (!data || data.rol !== 'admin') redirect('/login')
    employee = data
  }

  // We will fetch initial data for the dashboard here to SSR it,
  // but since it's a heavy interactive dashboard, we could just let AdminView fetch it client side.
  // For better UX, we'll fetch basic counts.

  return (
    <div className="pos-app min-h-screen bg-[var(--color-crema)] text-slate-900" style={posThemeStyle}>
      <header className="bg-white border-b border-[var(--color-bronce)]/20 p-4 flex justify-between items-center shadow-sm sticky top-0 z-10">
        <div>
          <HeaderBrand businessName={businessName} logoUrl={logoUrl} />
          <p className="text-xs text-slate-600 tracking-widest uppercase">Admin: {employee.nombre}</p>
        </div>
        <form action="/auth/signout" method="post">
          <input type="hidden" name="tenantSlug" value={tenantSlug} />
          <button className="text-sm font-bold text-red-600 uppercase tracking-wider hover:underline">
            Salir
          </button>
        </form>
      </header>

      <main className="p-0 md:p-4 max-w-7xl mx-auto md:h-[calc(100vh-80px)] md:overflow-hidden min-h-[calc(100dvh-80px)]">
        <AdminView employeeId={employee.id} />
      </main>
    </div>
  )
}
