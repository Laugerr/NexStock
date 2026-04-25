import { NavLink } from 'react-router-dom'
import { clsx } from 'clsx'
import {
  LayoutDashboard,
  Warehouse,
  Package,
  BoxesIcon,
  ArrowRightLeft,
  Users,
  ClipboardList,
  PackageCheck,
  MoveRight,
  ShoppingCart,
  ScanBarcode,
} from 'lucide-react'

const navGroups = [
  {
    label: 'Overview',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Configuration',
    items: [
      { to: '/warehouses', label: 'Warehouses', icon: Warehouse },
      { to: '/products', label: 'Products', icon: Package },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/grn', label: 'Goods Receipt', icon: PackageCheck },
      { to: '/put-away', label: 'Put-Away', icon: MoveRight },
      { to: '/pick-pack', label: 'Pick & Pack', icon: ShoppingCart },
      { to: '/cycle-count', label: 'Cycle Count', icon: ScanBarcode },
    ],
  },
  {
    label: 'Stock',
    items: [
      { to: '/inventory', label: 'Inventory', icon: BoxesIcon },
      { to: '/stock-movements', label: 'Stock Movements', icon: ArrowRightLeft },
    ],
  },
  {
    label: 'Admin',
    items: [
      { to: '/users', label: 'Users', icon: Users },
      { to: '/audit', label: 'Audit Log', icon: ClipboardList },
    ],
  },
]

export function Sidebar() {
  return (
    <aside className="flex h-full w-64 flex-col border-r border-gray-200 bg-white">
      {/* Brand */}
      <div className="flex h-16 items-center gap-3 border-b border-gray-100 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
          <BoxesIcon className="h-5 w-5" />
        </div>
        <span className="text-lg font-bold text-gray-900">NexStock</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    className={({ isActive }) =>
                      clsx(
                        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-brand-50 text-brand-700'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                      )
                    }
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-100 px-6 py-4">
        <p className="text-xs text-gray-400">NexStock WMS v0.1.0</p>
        <p className="text-xs text-gray-400">Phase 1 — Core Foundation</p>
      </div>
    </aside>
  )
}
