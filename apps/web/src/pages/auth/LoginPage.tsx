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

const DEMO_ACCOUNTS = [
  { label: 'Admin', email: 'admin@nexstock.com', password: 'Admin@123!' },
  { label: 'Manager', email: 'manager@nexstock.com', password: 'Manager@123!' },
  { label: 'Picker', email: 'picker@nexstock.com', password: 'Picker@123!' },
]

export function LoginPage() {
  const { mutate: login, isPending } = useLogin()

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })

  const onSubmit = (data: LoginForm) => login(data)

  const fillDemo = (email: string, password: string) => {
    setValue('email', email, { shouldValidate: true })
    setValue('password', password, { shouldValidate: true })
  }

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

      <div className="mt-6">
        <p className="text-xs font-medium text-gray-400 text-center mb-3">— Try a demo account —</p>
        <div className="grid grid-cols-3 gap-2">
          {DEMO_ACCOUNTS.map(({ label, email, password }) => (
            <button
              key={label}
              type="button"
              onClick={() => fillDemo(email, password)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 transition-colors"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
