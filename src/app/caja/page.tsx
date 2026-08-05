import { createClient } from '@/utils/supabase/server'
import CajaView from './CajaView'
import { redirect } from 'next/navigation'
import { NetworkStatus } from '@/components/NetworkStatus'
import { headers } from 'next/headers'
import { HeaderBrand } from '@/components/HeaderBrand'
import { getPosThemeStyle } from '@/lib/themes'

export default async function CajaPage() {
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

    if (!data) redirect('/login')
    employee = data
  }

  // Fetch active orders (only those with unpaid items)
  const { data: activeOrders } = await supabase
    .from('orders')
    .select('*, tables(numero), order_items(*, product:products(nombre), extra:product_extras(nombre), creador:employees!order_items_creado_por_fkey(nombre, rol))')
    .eq('estado', 'abierto')
    .order('creado_en', { ascending: true })

  const [productsRes, extrasRes, ingRes, tablesRes, categoriesRes] = await Promise.all([
    supabase.from('products').select('*').eq('activo', true).order('categoria'),
    supabase.from('product_extras').select('*').eq('activo', true),
    supabase.from('product_ingredients').select('*').order('nombre'),
    supabase.from('tables').select('*').order('numero'),
    supabase.from('categories').select('*').order('orden')
  ])

  return (
    <div className="pos-app h-dvh bg-[var(--color-crema)] text-slate-900 flex flex-col overflow-hidden" style={posThemeStyle}>
      <NetworkStatus />
      <header className="bg-white border-b border-[var(--color-bronce)]/20 p-4 flex justify-between items-center shadow-sm sticky top-0 z-10">
        <div>
          <HeaderBrand businessName={businessName} logoUrl={logoUrl} />
          <p className="text-xs text-slate-600 tracking-widest uppercase">Caja: {employee.nombre}</p>
        </div>
        <form action="/auth/signout" method="post">
          <input type="hidden" name="tenantSlug" value={tenantSlug} />
          <button className="text-sm font-bold text-red-600 uppercase tracking-wider hover:underline">
            Salir
          </button>
        </form>
      </header>

      <main className="flex-1 min-h-0 p-4 max-w-7xl mx-auto w-full overflow-hidden flex flex-col">
        <CajaView 
          initialOrders={activeOrders || []} 
          products={productsRes.data || []}
          extras={extrasRes.data || []}
          ingredients={ingRes.data || []}
          tables={tablesRes.data || []}
          employeeId={employee.id}
          employeeName={employee.nombre}
          employeeRol={employee.rol}
          businessName={businessName}
          brandLogoUrl={logoUrl}
          categoriesList={categoriesRes.data || []}
        />
      </main>
    </div>
  )
}
