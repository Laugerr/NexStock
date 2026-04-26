import { QueryClient } from '@tanstack/react-query'
import { getErrorMessage } from './api-client'
import toast from 'react-hot-toast'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: (failureCount, error) => {
        // Don't retry client errors (4xx) — these are deterministic failures
        const status = (error as { response?: { status: number } })?.response?.status
        if (status && status >= 400 && status < 500) return false
        // Retry up to 2 times for network errors / cold-start timeouts
        return failureCount < 2
      },
      // Give cold-starting Vercel functions time to wake up before showing errors
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    },
    mutations: {
      onError: (error) => {
        toast.error(getErrorMessage(error))
      },
    },
  },
})
