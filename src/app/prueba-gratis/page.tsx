import { TrialForm } from './TrialForm'

export const metadata = {
  title: 'Prueba Gratis - Abaroa POS',
  description: 'Comienza tu prueba gratuita de 14 días con Abaroa POS. Sistema punto de venta moderno y fácil de usar.',
}

export default function PruebaGratisPage() {
  return (
    <div className="h-full overflow-y-auto flex flex-col">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg w-full">
        <TrialForm />
      </div>
    </div>
  )
}
