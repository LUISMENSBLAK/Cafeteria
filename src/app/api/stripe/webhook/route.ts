import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // Sin apiVersion fijo
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  let event: Stripe.Event;

  try {
    const bodyText = await req.text();
    const signature = req.headers.get('stripe-signature') as string;
    
    // Si no hay firma, probablemente sea tráfico directo
    if (!signature) {
      return NextResponse.json({ error: 'Falta la firma de Stripe' }, { status: 400 });
    }

    event = stripe.webhooks.constructEvent(bodyText, signature, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        const tenantId = session.metadata?.tenant_id;
        const plan = session.metadata?.plan;

        if (!tenantId || !plan) {
          console.error('Falta tenant_id o plan en metadata de la sesión', session.id);
          break;
        }

        if (plan === 'unico') {
          // Pago único
          await supabaseAdmin.from('tenants').update({
            estado: 'activo',
            plan: 'unico',
            licencia_pagada_en: new Date().toISOString(),
            stripe_payment_intent_id: session.payment_intent as string,
          }).eq('id', tenantId);
        } else if (plan === 'mensual') {
          // Suscripción
          await supabaseAdmin.from('tenants').update({
            estado: 'activo',
            plan: 'mensual',
            stripe_subscription_id: session.subscription as string,
          }).eq('id', tenantId);
        }
        
        console.log(`Checkout completado para tenant: ${tenantId}, plan: ${plan}`);
        break;
      }
      
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = (invoice as any).subscription as string;
        
        if (subscriptionId) {
          await supabaseAdmin.from('tenants').update({
            estado: 'vencido'
          }).eq('stripe_subscription_id', subscriptionId);
          console.log(`Pago de invoice falló para suscripción: ${subscriptionId}. Tenant marcado como vencido.`);
        } else {
          // Si por alguna razón falla un invoice sin suscripción (raro pero posible), buscar por customer
          const customerId = invoice.customer as string;
          if (customerId) {
            await supabaseAdmin.from('tenants').update({
              estado: 'vencido'
            }).eq('stripe_customer_id', customerId);
          }
        }
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await supabaseAdmin.from('tenants').update({
          estado: 'vencido'
        }).eq('stripe_subscription_id', subscription.id);
        console.log(`Suscripción cancelada: ${subscription.id}. Tenant marcado como vencido.`);
        break;
      }
      
      default:
        console.log(`Evento no manejado: ${event.type}`);
    }
  } catch (err: any) {
    console.error(`Error procesando webhook ${event.type}:`, err);
    // Retornamos 500 para que Stripe intente nuevamente (solo en errores de DB graves)
    return NextResponse.json({ error: 'Error procesando evento' }, { status: 500 });
  }

  // Siempre regresar 200 si el procesamiento fue exitoso para confirmar a Stripe
  return NextResponse.json({ received: true });
}
