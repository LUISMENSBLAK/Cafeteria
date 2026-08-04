import { TrialForm } from './TrialForm'

export const metadata = {
  title: 'Prueba Gratis - Abaroa POS',
  description: 'Comienza tu prueba gratuita de 14 días con Abaroa POS. Sistema punto de venta moderno y fácil de usar.',
}

export default function PruebaGratisPage() {
  return (
    <div className="h-full overflow-y-auto bg-[var(--color-crema)] flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-[url('/bg-pattern.svg')] bg-repeat">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg mb-8">
        <h1 className="text-center text-4xl font-extrabold text-[var(--color-bronce)] tracking-tight">
          Abaroa POS
        </h1>
        <p className="mt-4 text-center text-lg text-[var(--color-gris)]">
          Impulsa tu negocio con un Punto de Venta diseñado para cafeterías y restaurantes.
        </p>
      </div>
      <div className="sm:mx-auto sm:w-full sm:max-w-lg">
        <TrialForm />
      </div>
      <div className="mt-12 text-center text-sm text-[var(--color-gris)]">
        <p>¿Ya tienes una cuenta? <a href="/login" className="text-[var(--color-bronce)] font-semibold hover:underline">Inicia sesión</a></p>
      </div>
    </div>
  )
}
