import axios, { AxiosError } from 'axios'
import { useAuthStore } from '@/store/auth.store'
import type { ApiError } from '@/types/api.types'

const apiClient = axios.create({
  baseURL: '/', // Using Vite proxy — all /api/* requests forwarded to :3001
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
})

// Attach JWT on every request
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle auth errors globally
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
      // Don't use navigate here to avoid React context issues; let ProtectedRoute handle it
    }
    return Promise.reject(error)
  },
)

export default apiClient

// Helper to extract a friendly error message
export function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    return (
      error.response?.data?.error?.message ??
      error.message ??
      'An unexpected error occurred'
    )
  }
  if (error instanceof Error) return error.message
  return 'An unexpected error occurred'
}
