import { QueryClient } from '@tanstack/react-query'
import { getErrorMessage } from './api-client'
import toast from 'react-hot-toast'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        const status = (error as { response?: { status: number } })?.response?.status
        if (status && status >= 400 && status < 500) return false
        return failureCount < 2
      },
    },
    mutations: {
      onError: (error) => {
        toast.error(getErrorMessage(error))
      },
    },
  },
})
