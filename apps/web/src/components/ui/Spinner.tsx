import { clsx } from 'clsx'
import { Loader2 } from 'lucide-react'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  label?: string
}

const sizes = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8' }

export function Spinner({ size = 'md', className, label = 'Loading...' }: SpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-gray-500">
      <Loader2 className={clsx('animate-spin text-brand-600', sizes[size], className)} />
      {label && <p className="text-sm">{label}</p>}
    </div>
  )
}
