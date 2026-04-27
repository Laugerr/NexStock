import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import apiClient from '@/lib/api-client'
import { useAuthStore } from '@/store/auth.store'
import type { ApiResponse, LoginResponse } from '@/types/api.types'

export function useLogin() {
  const { login } = useAuthStore()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const { data } = await apiClient.post<ApiResponse<LoginResponse>>(
        '/api/v1/auth/login',
        credentials,
      )
      return data.data
    },
    onSuccess: (data) => {
      login(data.token, data.user)
      toast.success(`Welcome back, ${data.user.firstName}!`)
      navigate('/dashboard')
    },
  })
}

export function useLogout() {
  const { logout } = useAuthStore()
  const navigate = useNavigate()

  return async () => {
    try {
      await apiClient.post('/api/v1/auth/logout')
    } catch {
      // Logout locally even if the API call fails
    }
    logout()
    navigate('/login')
    toast.success('Logged out successfully')
  }
}
