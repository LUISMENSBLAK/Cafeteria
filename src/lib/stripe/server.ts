import Stripe from 'stripe'

let stripeClient: Stripe | null = null

export function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) throw new Error('Stripe no está configurado en el servidor.')

  if (!stripeClient) stripeClient = new Stripe(secretKey)
  return stripeClient
}

export function stripeObjectId(
  value: string | { id: string } | null | undefined,
): string | null {
  if (!value) return null
  return typeof value === 'string' ? value : value.id
}

export function subscriptionPeriodEnd(subscription: Stripe.Subscription) {
  const timestamps = subscription.items.data
    .map((item) => item.current_period_end)
    .filter((value): value is number => Number.isFinite(value))

  if (timestamps.length === 0) return null
  return new Date(Math.max(...timestamps) * 1000).toISOString()
}
