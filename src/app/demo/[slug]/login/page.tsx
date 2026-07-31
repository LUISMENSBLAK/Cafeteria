import { headers } from 'next/headers'
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

  return <DemoLoginForm slug={slug} businessName={businessName} />
}
