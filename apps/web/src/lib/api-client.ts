import axios, { AxiosError } from 'axios'
import { useAuthStore } from '@/store/auth.store'
import type { ApiError } from '@/types/api.types'

/**
 * VITE_API_URL controls where API calls go:
 *
 *  Dev (Vite proxy):   not set → baseURL '' → proxy rewrites /api/* → localhost:3001
 *  Prod (same domain): not set → baseURL '' → /api/* hits Vercel functions on same origin
 *  Prod (two projects): VITE_API_URL = https://nexstock-api.vercel.app → cross-origin
 *
 * Never hardcode a URL here — always read from the env var.
 */
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
  headers: { 'Content-Type': 'application/json' },
  // 30 s: covers Vercel cold starts (~500–1500 ms) plus actual execution time
  timeout: 30_000,
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
      // Don't navigate here — ProtectedRoute handles the redirect
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
