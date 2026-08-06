# Ciclo comercial de Innova Coffee POS

## Fuente de verdad

La decisión de acceso vive en `src/lib/billing/access.ts`, en `canTenantAccessPOS(tenant)`. Compara instantes `TIMESTAMPTZ`/ISO 8601 en UTC, sin redondear por día.

- `trialing`: acceso hasta el instante exacto de `trial_termina_en`.
- `active` + `one_time`: acceso sin vencimiento comercial.
- `active` + `monthly`: acceso hasta `current_period_end`; si Stripe aún no ha informado el periodo, conserva acceso para una suscripción legada activa.
- `past_due`: acceso solo hasta `grace_period_ends_at` (3 días por defecto).
- `canceled`: acceso hasta el final del periodo ya pagado.
- `expired`: sin acceso.
- `suspended`: sin acceso, incluso si existe licencia.

`src/lib/billing/server.ts` resuelve usuario → empleado → tenant y expone `requireActiveTenantAccess()`. Proxy realiza la redirección optimista; las Server Actions, las políticas RLS y los wrappers de RPC vuelven a validar en su propia frontera.

## Migraciones

Aplicar en orden:

1. `supabase/migrations/20260804000000_commercial_lifecycle.sql`
2. `supabase/migrations/20260804000001_commercial_rpc_guards.sql`

La primera conserva los campos existentes (`estado`, `plan`, `trial_termina_en`, `stripe_customer_id`, `stripe_subscription_id`, `stripe_payment_intent_id`, `licencia_pagada_en`) y agrega el estado comercial detallado, fechas de periodo/gracia, referencias de pago y bitácoras idempotentes. Un trigger mantiene sincronizados `estado` y `plan` por compatibilidad.

La segunda no reescribe la operación del POS: renombra cada RPC existente como implementación privada y publica un wrapper con la misma firma que ejecuta el guard comercial antes de delegar.

## Configuración de Stripe

Crear dos Prices en MXN:

1. Precio único de **$5,000 MXN** → `STRIPE_PRICE_LIFETIME`.
2. Precio recurrente mensual de **$500 MXN/mes** → `STRIPE_PRICE_MONTHLY_RECURRING`.

El checkout mensual crea en servidor un concepto único de instalación y activación por **$3,000 MXN** y agrega el Price recurrente de **$500 MXN/mes** con el primer cobro aplazado un mes. El total del checkout inicial es únicamente $3,000 MXN; la mensualidad no se cobra en esa compra.

Configurar el Customer Portal de Stripe para permitir actualizar métodos de pago y pagar facturas. Guardar opcionalmente su configuración en `STRIPE_CUSTOMER_PORTAL_CONFIGURATION_ID`.

## Webhook

Endpoint: `POST /api/stripe/webhook`.

Registrar estos eventos:

- `checkout.session.completed`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `invoice.paid`
- `invoice.payment_failed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Copiar el signing secret a `STRIPE_WEBHOOK_SECRET`. Cada evento se reclama por `event.id` en `stripe_webhook_events`; un evento procesado se responde sin repetir activaciones. Para suscripciones se recupera el objeto actual de Stripe, evitando depender del orden de entrega. La URL de éxito nunca activa un tenant.

## Recordatorios de prueba

Programar cada hora:

```sh
curl -X POST https://TU_DOMINIO/api/commercial/trial-reminders \
  -H "Authorization: Bearer $CRON_SECRET"
```

La ruta prepara recordatorios a 3 días, 1 día y el día del vencimiento; después envía el aviso de prueba finalizada y sincroniza `billing_status=expired`. `commercial_email_events` impide duplicados. Si se despliega en una plataforma con scheduler, usar la misma petición POST y conservar `CRON_SECRET` solo en servidor.

## Correos

Las plantillas están en `src/lib/email/templates.ts`: bienvenida, recordatorios, prueba finalizada, pago confirmado, pago mensual fallido y suscripción cancelada. Todas incluyen HTML de tablas, ancho máximo de 600 px, estilos inline, preheader, texto plano, wrapping de valores largos y CTA de al menos 48 px.

`RESEND_FROM_EMAIL` debe ser una dirección verificada. El nombre visible siempre es `Innova Network`.
