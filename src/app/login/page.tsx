import { headers } from 'next/headers'

import { LoginForm } from './LoginForm'

interface LoginPageProps {
  searchParams: Promise<{ tenant?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const [{ tenant }, headersList] = await Promise.all([searchParams, headers()])
  const rawName = headersList.get('x-business-name')
  const rawLogo = headersList.get('x-logo-url')
  const headerSlug = headersList.get('x-tenant-slug')

  return (
    <LoginForm
      businessName={rawName ? decodeURIComponent(rawName) : 'Innova Coffee POS'}
      logoUrl={rawLogo ? decodeURIComponent(rawLogo) : undefined}
      tenantSlug={headerSlug || tenant}
    />
  )
}
