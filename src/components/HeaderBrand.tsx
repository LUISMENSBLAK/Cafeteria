import Image from 'next/image'
import { Coffee } from 'lucide-react'

export function HeaderBrand({ businessName, logoUrl }: { businessName: string; logoUrl?: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="relative grid h-9 w-20 shrink-0 place-items-center overflow-hidden rounded-lg bg-white">
        {logoUrl ? (
          <Image src={logoUrl} alt={`Logo de ${businessName}`} fill sizes="80px" className="object-contain" />
        ) : (
          <Coffee size={22} className="text-[var(--color-bronce)]" aria-hidden="true" />
        )}
      </div>
      <span className="truncate text-sm font-extrabold text-slate-900">{businessName}</span>
    </div>
  )
}
