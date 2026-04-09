import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useLogin } from '@/hooks/use-auth'

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
})

type LoginForm = z.infer<typeof loginSchema>

export function LoginPage() {
  const { mutate: login, isPending } = useLogin()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })

  const onSubmit = (data: LoginForm) => login(data)

  return (
    <div className="rounded-2xl bg-white p-8 shadow-2xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Sign in</h2>
        <p className="mt-1 text-sm text-gray-500">
          Welcome back — enter your credentials to continue
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Email address"
          type="email"
          autoComplete="email"
          placeholder="you@nexstock.com"
          error={errors.email?.message}
          {...register('email')}
        />

        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register('password')}
        />

        <Button type="submit" className="w-full mt-2" isLoading={isPending} size="lg">
          Sign in
        </Button>
      </form>

      <div className="mt-6 rounded-lg border border-gray-100 bg-gray-50 p-4">
        <p className="text-xs font-medium text-gray-500 mb-2">Demo credentials</p>
        <div className="space-y-1 text-xs text-gray-600 font-mono">
          <p>admin@nexstock.com / Admin@123!</p>
          <p>manager@nexstock.com / Manager@123!</p>
          <p>picker@nexstock.com / Picker@123!</p>
        </div>
      </div>
    </div>
  )
}
