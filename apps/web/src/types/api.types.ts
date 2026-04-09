// ── API Response shapes ────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean
  data: T
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface ApiError {
  success: false
  error: {
    code: string
    message: string
    details?: Record<string, string[]>
  }
}

// ── Auth ───────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  permissions?: string[]
}

export interface LoginResponse {
  token: string
  user: AuthUser
}

// ── Warehouse ──────────────────────────────────────────────────────────────

export interface Warehouse {
  id: string
  code: string
  name: string
  description: string | null
  address: string | null
  city: string | null
  state: string | null
  country: string | null
  postalCode: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  _count?: { zones: number }
}

export interface Zone {
  id: string
  warehouseId: string
  code: string
  name: string
  type: 'RECEIVING' | 'STORAGE' | 'PICKING' | 'SHIPPING' | 'STAGING' | 'QUARANTINE'
  isActive: boolean
  createdAt: string
  _count?: { locations: number }
}

export interface Location {
  id: string
  zoneId: string
  code: string
  aisle: string | null
  bay: string | null
  level: string | null
  position: string | null
  isActive: boolean
}

// ── Product ────────────────────────────────────────────────────────────────

export interface Product {
  id: string
  sku: string
  name: string
  description: string | null
  barcode: string | null
  unit: string
  weight: string | null
  category: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  _count?: { inventoryItems: number }
}

// ── Inventory ──────────────────────────────────────────────────────────────

export interface InventoryItem {
  id: string
  quantity: number
  reservedQty: number
  product: Pick<Product, 'id' | 'sku' | 'name' | 'unit' | 'category'>
  location: {
    id: string
    code: string
    aisle: string | null
    bay: string | null
    level: string | null
    zone: {
      id: string
      code: string
      name: string
      type: string
      warehouse: { id: string; code: string; name: string }
    }
  }
  updatedAt: string
}

export interface InventorySummary {
  totalProducts: number
  totalLocations: number
  totalMovements: number
  warehouseCount: number
  totalStock: number
}

// ── Stock Movement ─────────────────────────────────────────────────────────

export type MovementType =
  | 'RECEIPT'
  | 'PUTAWAY'
  | 'PICK'
  | 'ADJUSTMENT'
  | 'TRANSFER'
  | 'RETURN'
  | 'WRITE_OFF'

export type MovementStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

export interface StockMovement {
  id: string
  type: MovementType
  status: MovementStatus
  quantity: number
  reference: string | null
  notes: string | null
  createdAt: string
  product: Pick<Product, 'id' | 'sku' | 'name' | 'unit'>
  fromLocation: Pick<Location, 'id' | 'code'> | null
  toLocation: Pick<Location, 'id' | 'code'> | null
  performedBy: { id: string; firstName: string; lastName: string; email: string }
}

// ── User ───────────────────────────────────────────────────────────────────

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  isActive: boolean
  createdAt: string
  role: { id: string; name: string }
}

export interface Role {
  id: string
  name: string
  description: string | null
}
