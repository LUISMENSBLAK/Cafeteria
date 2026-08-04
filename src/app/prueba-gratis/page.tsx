import { TrialForm } from './TrialForm'

export const metadata = {
  title: 'Prueba Gratis - Abaroa POS',
  description: 'Comienza tu prueba gratuita de 14 días con Abaroa POS. Sistema punto de venta moderno y fácil de usar.',
}

export default function PruebaGratisPage() {
  return (
    <div className="h-full overflow-y-auto flex flex-col py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg">
        <TrialForm />
      </div>
      <div className="mt-12 text-center text-sm text-[var(--color-gris)]">
        <p>¿Ya tienes una cuenta? <a href="/login" className="text-[var(--color-bronce)] font-semibold hover:underline">Inicia sesión</a></p>
      </div>
    </div>
  )
}
