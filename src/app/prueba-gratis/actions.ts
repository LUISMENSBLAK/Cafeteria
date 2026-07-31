'use server'

import { createClient } from '@supabase/supabase-js'
import { sendWelcomeEmail } from '@/lib/email/sendWelcomeEmail'
import crypto from 'crypto'

export async function createTrialTenant(formData: FormData) {
  const nombreNegocio = formData.get('nombreNegocio') as string
  const nombreContacto = formData.get('nombreContacto') as string
  const emailContacto = formData.get('emailContacto') as string
  const telefonoContacto = formData.get('telefonoContacto') as string

  if (!nombreNegocio || !nombreContacto || !emailContacto) {
    return { success: false, error: "Por favor llena todos los campos obligatorios." }
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
          estado: 'trial'
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
    const trialTerminaEn = tenantData.trial_termina_en;

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

    // Si llegamos hasta aquí, la DB está lista
    // 5. Enviar el correo de bienvenida (Try/Catch aislado)
    try {
      await sendWelcomeEmail({ 
        email: emailContacto, 
        nombreNegocio, 
        nombreContacto, 
        password: randomPassword, 
        slug: finalSlug,
        trialTerminaEn 
      })
    } catch (emailError) {
      console.error('Error enviando correo de bienvenida con Resend:', emailError)
    }

    // Éxito
    return { success: true, slug: finalSlug, email: emailContacto, password: randomPassword }

  } catch (error: any) {
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
    
    return { success: false, error: error.message || "Ocurrió un error inesperado al procesar tu solicitud." }
  }
}
