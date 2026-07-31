import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // Omitimos apiVersion fijo por requerimiento, para que use default
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  const plan = searchParams.get('plan'); // 'mensual' | 'unico'

  if (!slug || !plan) {
    return NextResponse.json({ error: 'Faltan parámetros (slug, plan)' }, { status: 400 });
  }

  if (plan !== 'mensual' && plan !== 'unico') {
    return NextResponse.json({ error: 'Plan inválido' }, { status: 400 });
  }

  try {
    // 1. Obtener tenant
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .select('id, nombre_negocio, email_contacto, stripe_customer_id')
      .eq('slug', slug)
      .single();

    if (tenantError || !tenant) {
      return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 404 });
    }

    // 2. Obtener o crear Customer en Stripe
    let stripeCustomerId = tenant.stripe_customer_id;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: tenant.email_contacto,
        name: tenant.nombre_negocio,
        metadata: {
          tenant_id: tenant.id,
        },
      });
      stripeCustomerId = customer.id;

      // Actualizar tenant con el nuevo customer ID
      await supabaseAdmin
        .from('tenants')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', tenant.id);
    }

    // 3. Obtener Price ID basado en el plan elegido
    const priceId = plan === 'mensual' 
      ? process.env.STRIPE_PRICE_MONTHLY 
      : process.env.STRIPE_PRICE_LIFETIME;

    if (!priceId) {
      return NextResponse.json({ error: 'Price ID no configurado en entorno' }, { status: 500 });
    }

    // 4. Crear Checkout Session
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const successUrl = `${baseUrl}/admin`;
    // Si cancela, regresarlo a la vista de vencido o login
    const cancelUrl = `${baseUrl}/demo/${slug}/vencido`; 

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: plan === 'mensual' ? 'subscription' : 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        tenant_id: tenant.id,
        plan: plan,
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    if (!session.url) {
      return NextResponse.json({ error: 'Error al generar checkout url' }, { status: 500 });
    }

    // 5. Redirigir al usuario al Stripe Checkout
    return NextResponse.redirect(session.url, { status: 302 });

  } catch (error: any) {
    console.error('Stripe Checkout Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
