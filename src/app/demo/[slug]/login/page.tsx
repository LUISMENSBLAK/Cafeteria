import { headers } from 'next/headers'
import { getContrastingTextColor } from '@/lib/themes'
import { DemoLoginForm } from './DemoLoginForm'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const headersList = await headers()
  const rawName = headersList.get('x-business-name')
  const businessName = rawName ? decodeURIComponent(rawName) : slug
  return {
    title: `Iniciar Sesión — ${businessName}`,
  }
}

export default async function DemoLoginPage({ params }: Props) {
  const { slug } = await params
  const headersList = await headers()
  const rawName = headersList.get('x-business-name')
  const businessName = rawName ? decodeURIComponent(rawName) : slug
  const rawLogo = headersList.get('x-logo-url')
  const logoUrl = rawLogo ? decodeURIComponent(rawLogo) : undefined
  const accentColor = headersList.get('x-theme-secundario') ?? '#7A5A32'
  const accentTextColor = getContrastingTextColor(accentColor)

  return (
    <DemoLoginForm
      slug={slug}
      businessName={businessName}
      logoUrl={logoUrl}
      accentTextColor={accentTextColor}
    />
  )
}
