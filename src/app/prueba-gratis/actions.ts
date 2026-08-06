'use server'

import { createClient } from '@supabase/supabase-js'
import { sendWelcomeEmail } from '@/lib/email/sendWelcomeEmail'
import { TEMAS_DISPONIBLES, TemaKey } from '@/lib/themes'
import { buildProductAssetPath } from '@/lib/storagePaths'
import crypto from 'crypto'
import sharp from 'sharp'

export async function createTrialTenant(formData: FormData) {
  const nombreNegocio = formData.get('nombreNegocio') as string
  const nombreContacto = formData.get('nombreContacto') as string
  const emailContacto = formData.get('emailContacto') as string
  const telefonoContacto = formData.get('telefonoContacto') as string
  const logoFile = formData.get('logo') as File | null
  const temaKey = (formData.get('tema') as TemaKey) || 'cafe'
  const tema = TEMAS_DISPONIBLES[temaKey] ?? TEMAS_DISPONIBLES.cafe

  if (!nombreNegocio || !nombreContacto || !emailContacto) {
    return { success: false, error: "Por favor llena todos los campos obligatorios." }
  }

  if (logoFile && logoFile.size > 0) {
    const allowedLogoTypes = new Set(['image/png', 'image/jpeg', 'image/webp'])
    if (!allowedLogoTypes.has(logoFile.type)) {
      return { success: false, error: 'El logo debe ser PNG, JPG, JPEG o WebP.' }
    }
    if (logoFile.size > 5 * 1024 * 1024) {
      return { success: false, error: 'La imagen no puede pesar más de 5MB.' }
    }
  }

  // 1. Cliente aislado
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let createdTenantId: string | null = null;
  let createdUserId: string | null = null;
  let finalSlug: string = '';
  let randomPassword = '';

  try {
    const trialStartedAt = new Date()
    const trialTerminaEn = new Date(trialStartedAt.getTime() + 14 * 24 * 60 * 60 * 1000)

    // 2. Generar slug con reintentos
    const baseSlug = nombreNegocio
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    let slug = baseSlug;
    let tenantData = null;
    let attempts = 0;
    
    while (attempts < 20) {
      const { data, error } = await supabaseAdmin
        .from('tenants')
        .insert({
          slug,
          nombre_negocio: nombreNegocio,
          nombre_contacto: nombreContacto,
          email_contacto: emailContacto,
          telefono_contacto: telefonoContacto || null,
          estado: 'trial',
          trial_started_at: trialStartedAt.toISOString(),
          trial_termina_en: trialTerminaEn.toISOString(),
          billing_status: 'trialing',
          plan_type: null,
          theme_color_primario: tema.theme_color_primario,
          theme_color_secundario: tema.theme_color_secundario,
          theme_color_terciario: tema.theme_color_terciario,
          theme_color_texto: tema.theme_color_texto,
        })
        .select()
        .single();
      
      if (!error && data) {
        tenantData = data;
        break;
      }
      
      // Si el error es unique constraint en slug (23505)
      if (error?.code === '23505') {
        attempts++;
        slug = `${baseSlug}-${attempts + 1}`;
      } else {
        throw new Error(error?.message || "Error al crear el espacio del tenant.");
      }
    }

    if (!tenantData) {
      throw new Error("No se pudo generar un identificador único para tu negocio después de varios intentos.");
    }

    createdTenantId = tenantData.id;
    finalSlug = tenantData.slug;
    const storedTrialEnd = tenantData.trial_termina_en;

    // 3. Crear el usuario en Supabase Auth
    randomPassword = crypto.randomBytes(12).toString('base64').slice(0, 16);
    
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: emailContacto,
      password: randomPassword,
      email_confirm: true
    });

    if (authError) {
      if (authError.message.toLowerCase().includes('already registered')) {
        throw new Error("Ya existe una prueba registrada con este correo. Revisa tu bandeja de entrada o contáctanos en innovanetwork15@gmail.com si necesitas ayuda.");
      }
      throw new Error(authError.message);
    }

    if (!authData.user) {
      throw new Error("No se pudo crear el usuario administrador.");
    }
    createdUserId = authData.user.id;

    // 4. Crear el empleado admin asociado (PIN de 4 dígitos)
    let empSuccess = false;
    let empAttempts = 0;
    let lastEmpError = null;

    while (empAttempts < 20) {
      const pin = Math.floor(1000 + Math.random() * 9000).toString();
      const { error: empError } = await supabaseAdmin
        .from('employees')
        .insert({
          id: createdUserId,
          nombre: nombreContacto,
          pin,
          rol: 'admin',
          tenant_id: createdTenantId
        });
      
      if (!empError) {
        empSuccess = true;
        break;
      }
      
      if (empError?.code === '23505') { // Unique pin conflict
        empAttempts++;
      } else {
        lastEmpError = empError;
        break;
      }
    }

    if (!empSuccess) {
      throw new Error(lastEmpError?.message || "No se pudo asignar un PIN único para el administrador.");
    }

    // --- 4.5. SUBIR LOGO SI SE ADJUNTÓ ---
    if (logoFile && logoFile.size > 0) {
      try {
        const originalBuffer = Buffer.from(await logoFile.arrayBuffer())
        const metadata = await sharp(originalBuffer).metadata()
        if (!metadata.format || !['png', 'jpeg', 'webp'].includes(metadata.format)) {
          throw new Error('Formato de imagen no válido.')
        }

        const optimizedLogo = await sharp(originalBuffer)
          .rotate()
          .resize(1600, 1000, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 88 })
          .toBuffer()
        const fileName = buildProductAssetPath(createdTenantId, 'logos', 'brand.webp')
        const { error: logoUploadError } = await supabaseAdmin.storage
          .from('productos')
          .upload(fileName, optimizedLogo, { upsert: true, contentType: 'image/webp' })

        if (!logoUploadError) {
          const { data: { publicUrl } } = supabaseAdmin.storage.from('productos').getPublicUrl(fileName)
          await supabaseAdmin.from('tenants').update({ logo_marca_url: publicUrl }).eq('id', createdTenantId)
        } else {
          console.error('Error subiendo logo en registro:', logoUploadError)
        }
      } catch (logoErr) {
        console.error('Error inesperado subiendo logo:', logoErr)
      }
    }

    // --- 4.6. SEMILLA INICIAL ---
    // Categorías
    const seedCategorias = [
      { nombre: 'Bebidas Calientes', orden: 1, tenant_id: createdTenantId },
      { nombre: 'Bebidas Frías', orden: 2, tenant_id: createdTenantId },
      { nombre: 'Comida', orden: 3, tenant_id: createdTenantId },
      { nombre: 'Postres', orden: 4, tenant_id: createdTenantId }
    ];
    const { data: catsData, error: catsError } = await supabaseAdmin
      .from('categories')
      .insert(seedCategorias)
      .select('id, nombre');

    if (!catsError && catsData) {
      const idCalientes = catsData.find(c => c.nombre === 'Bebidas Calientes')?.id;
      const idFrias = catsData.find(c => c.nombre === 'Bebidas Frías')?.id;
      const idComida = catsData.find(c => c.nombre === 'Comida')?.id;
      const idPostres = catsData.find(c => c.nombre === 'Postres')?.id;

      const seedProductos = [
        { nombre: 'Café Americano', precio: 35, categoria_id: idCalientes, tenant_id: createdTenantId },
        { nombre: 'Capuccino', precio: 55, categoria_id: idCalientes, tenant_id: createdTenantId },
        { nombre: 'Latte', precio: 60, categoria_id: idCalientes, tenant_id: createdTenantId },
        { nombre: 'Frappé Clásico', precio: 75, categoria_id: idFrias, tenant_id: createdTenantId },
        { nombre: 'Limonada Mineral', precio: 45, categoria_id: idFrias, tenant_id: createdTenantId },
        { nombre: 'Sandwich de Pavo', precio: 85, categoria_id: idComida, tenant_id: createdTenantId },
        { nombre: 'Chilaquiles Sencillos', precio: 95, categoria_id: idComida, tenant_id: createdTenantId },
        { nombre: 'Rebanada Pastel de Chocolate', precio: 65, categoria_id: idPostres, tenant_id: createdTenantId },
        { nombre: 'Cheesecake', precio: 70, categoria_id: idPostres, tenant_id: createdTenantId }
      ];
      const { error: prodError } = await supabaseAdmin.from('products').insert(seedProductos);
      if (prodError) console.error('Error sembrando productos:', prodError);
    } else if (catsError) {
      console.error('Error sembrando categorías:', catsError);
    }

    // Mesas
    const seedMesas = [
      { numero: '1', estado: 'libre', tenant_id: createdTenantId },
      { numero: '2', estado: 'libre', tenant_id: createdTenantId },
      { numero: '3', estado: 'libre', tenant_id: createdTenantId },
      { numero: 'Barra', estado: 'libre', tenant_id: createdTenantId }
    ];
    const { error: mesasError } = await supabaseAdmin.from('tables').insert(seedMesas);
    if (mesasError) console.error('Error sembrando mesas:', mesasError);


    // Si llegamos hasta aquí, la DB está lista
    // 5. Enviar el correo de bienvenida (Try/Catch aislado)
    try {
      await sendWelcomeEmail({ 
        email: emailContacto, 
        nombreNegocio, 
        nombreContacto, 
        password: randomPassword, 
        slug: finalSlug,
        trialTerminaEn: storedTrialEnd
      })
    } catch (emailError) {
      console.error('Error enviando correo de bienvenida con Resend:', emailError)
    }

    // Éxito
    return { success: true, slug: finalSlug, email: emailContacto, password: randomPassword }

  } catch (error: unknown) {
    console.error('Error en createTrialTenant:', error);
    
    // Rollback manual
    if (createdUserId) {
      const { error: rbUserErr } = await supabaseAdmin.auth.admin.deleteUser(createdUserId);
      if (rbUserErr) console.error("Error rollback user:", rbUserErr);
    }
    if (createdTenantId) {
      const { error: rbTenErr } = await supabaseAdmin.from('tenants').delete().eq('id', createdTenantId);
      if (rbTenErr) console.error("Error rollback tenant:", rbTenErr);
    }
    
    const message = error instanceof Error ? error.message : "Ocurrió un error inesperado al procesar tu solicitud."
    return { success: false, error: message }
  }
}
