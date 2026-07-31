import type { Viewport } from "next";
import { Playfair_Display, Montserrat } from "next/font/google";
import { headers } from "next/headers";
import { TrialBanner } from "@/components/TrialBanner";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

// generateMetadata es async para poder leer los headers del request (inyectados por el middleware)
export async function generateMetadata() {
  const headersList = await headers();
  const rawName = headersList.get('x-business-name');
  const businessName = rawName ? decodeURIComponent(rawName) : 'Abaroa Bakery POS';
  return {
    title: `${businessName} — POS`,
    description: `Sistema de Punto de Venta para ${businessName}`,
    manifest: '/manifest.json',
    appleWebApp: {
      capable: true,
      title: businessName,
      statusBarStyle: 'black-translucent' as const,
    },
    icons: { apple: '/icon-192.png' },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Evita zoom accidental al tocar botones rápido
  viewportFit: "cover", // Permite usar todo el espacio de pantalla (Safe Area)
  themeColor: "#7A5A32", // Color Bronce para la barra de estado
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const themePrimario  = headersList.get('x-theme-primario')  ?? '#F5E6D3';
  const themeSecundario = headersList.get('x-theme-secundario') ?? '#7A5A32';
  const themeTerciario = headersList.get('x-theme-terciario') ?? '#8C8880';
  const themeTexto     = headersList.get('x-theme-texto')     ?? '#111111';
  const trialStatus    = headersList.get('x-trial-status')    ?? '';
  const trialDaysLeft  = headersList.get('x-trial-days-left') ?? '';
  const tenantSlug     = headersList.get('x-tenant-slug')     ?? '';

  // Inyectamos las variables CSS dinámicamente para que toda la app refleje
  // los colores del tenant (o de settings para instalaciones dedicadas)
  const cssVars = `:root {
    --color-crema: ${themePrimario};
    --color-bronce: ${themeSecundario};
    --color-gris: ${themeTerciario};
    --color-negro: ${themeTexto};
  }`;

  return (
    <html lang="es">
      <head>
        <style dangerouslySetInnerHTML={{ __html: cssVars }} />
      </head>
      <body
        className={`${playfair.variable} ${montserrat.variable} font-sans antialiased bg-crema text-negro min-h-screen`}
      >
        {children}
        {/* Banner de trial solo visible para tenants demo en modo trial */}
        {trialStatus === 'trial' && (
          <TrialBanner daysLeft={Number(trialDaysLeft)} slug={tenantSlug} />
        )}
      </body>
    </html>
  );
}
