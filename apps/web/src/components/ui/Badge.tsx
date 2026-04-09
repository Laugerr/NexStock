import { clsx } from 'clsx'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

const variants: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-700',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
  purple: 'bg-purple-100 text-purple-700',
}

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}

// Movement type → badge variant
export const movementTypeVariant: Record<string, BadgeVariant> = {
  RECEIPT: 'success',
  PUTAWAY: 'info',
  PICK: 'warning',
  ADJUSTMENT: 'purple',
  TRANSFER: 'default',
  RETURN: 'info',
  WRITE_OFF: 'danger',
}

export const zoneTypeVariant: Record<string, BadgeVariant> = {
  RECEIVING: 'info',
  STORAGE: 'success',
  PICKING: 'warning',
  SHIPPING: 'purple',
  STAGING: 'default',
  QUARANTINE: 'danger',
}
