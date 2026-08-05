import { createClient } from '@/utils/supabase/server'
import MeseroView from './MeseroView'
import { redirect } from 'next/navigation'
import { NetworkStatus } from '@/components/NetworkStatus'
import { headers } from 'next/headers'
import { HeaderBrand } from '@/components/HeaderBrand'
import { getPosThemeStyle } from '@/lib/themes'

export default async function MeseroPage() {
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

  // Fetch active products
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('activo', true)
    .order('categoria')

  // Fetch active extras
  const { data: extras } = await supabase
    .from('product_extras')
    .select('*')
    .eq('activo', true)

  // Fetch active product ingredients
  const { data: ingredients } = await supabase
    .from('product_ingredients')
    .select('*')
    .eq('activo', true)

  // Fetch tables
  const { data: tables } = await supabase
    .from('tables')
    .select('*')
    .order('numero')

  // Fetch categories
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('orden')

  // Fetch currently open orders for this Mesero (to allow editing before closing)
  // We'll fetch all open orders for now so they can view/edit active tables
  const { data: activeOrders } = await supabase
    .from('orders')
    .select('*, order_items(*, product:products(*))')
    .eq('estado', 'abierto')
    .order('creado_en', { ascending: false })

  return (
    <div className="pos-app h-dvh bg-[var(--color-crema)] text-slate-900 flex flex-col overflow-hidden" style={posThemeStyle}>
      <NetworkStatus />
      <header className="bg-white border-b border-[var(--color-bronce)]/20 py-2 px-4 flex justify-between items-center shadow-sm sticky top-0 z-10">
        <div>
          <HeaderBrand businessName={businessName} logoUrl={logoUrl} />
          <p className="text-xs text-slate-600 tracking-widest uppercase">Mesero: {employee.nombre}</p>
        </div>
        <form action="/auth/signout" method="post">
          <input type="hidden" name="tenantSlug" value={tenantSlug} />
          <button className="text-sm font-bold text-red-600 uppercase tracking-wider hover:underline">
            Salir
          </button>
        </form>
      </header>

      <main className="flex-1 min-h-0 px-4 pb-4 pt-2 overflow-hidden">
        <MeseroView 
          products={products || []}
          extras={extras || []}
          ingredients={ingredients || []}
          tables={tables || []} 
          initialActiveOrders={activeOrders || []}
          employeeId={employee.id}
          categoriesList={categories || []}
        />
      </main>
    </div>
  )
}
