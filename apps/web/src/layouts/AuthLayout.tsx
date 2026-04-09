import { BoxesIcon } from 'lucide-react'

interface AuthLayoutProps {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-brand-900 via-brand-800 to-brand-600">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 text-white">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
            <BoxesIcon className="h-7 w-7" />
          </div>
          <span className="text-3xl font-bold tracking-tight">NexStock</span>
        </div>
        <h1 className="mb-4 text-center text-4xl font-bold leading-tight">
          Modern Warehouse<br />Management System
        </h1>
        <p className="text-center text-lg text-blue-200 max-w-md">
          Real-time inventory tracking, intelligent stock control, and streamlined
          logistics operations — all in one platform.
        </p>

        <div className="mt-12 grid grid-cols-2 gap-4 w-full max-w-sm">
          {[
            { label: 'Warehouses', value: 'Multi-site' },
            { label: 'Tracking', value: 'Real-time' },
            { label: 'RBAC', value: 'Role-based' },
            { label: 'Audit', value: 'Full history' },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl bg-white/10 p-4 backdrop-blur">
              <p className="text-xs font-medium text-blue-200 uppercase tracking-wider">{label}</p>
              <p className="mt-1 text-lg font-semibold">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile brand */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
              <BoxesIcon className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">NexStock</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
