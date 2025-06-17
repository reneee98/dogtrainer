import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../contexts/AuthContext';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

const loginSchema = z.object({
  email: z.string().email('Neplatná emailová adresa'),
  password: z.string().min(6, 'Heslo musí mať aspoň 6 znakov'),
});

const registerSchema = z.object({
  name: z.string().min(2, 'Meno musí mať aspoň 2 znaky'),
  email: z.string().email('Neplatná emailová adresa'),
  password: z.string().min(6, 'Heslo musí mať aspoň 6 znakov'),
  password_confirmation: z.string(),
  role: z.enum(['owner', 'trainer'], { required_error: 'Vyberte rolu' }),
}).refine((data) => data.password === data.password_confirmation, {
  message: 'Heslá sa nezhodujú',
  path: ['password_confirmation'],
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

interface OnboardingWizardProps {
  onClose?: () => void;
}

export default function OnboardingWizard({ onClose }: OnboardingWizardProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const handleLogin = async (data: LoginFormData) => {
    setLoading(true);
    try {
      await login(data.email, data.password);
      onClose?.();
    } catch (error) {
      // Error is handled in AuthContext
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (data: RegisterFormData) => {
    setLoading(true);
    try {
      await register(data.name, data.email, data.password, data.role);
      onClose?.();
    } catch (error) {
      // Error is handled in AuthContext
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isLogin ? 'Prihlásenie' : 'Registrácia'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {isLogin ? 'Nemáte účet?' : 'Už máte účet?'}{' '}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              {isLogin ? 'Zaregistrujte sa' : 'Prihláste sa'}
            </button>
          </p>
        </div>

        {isLogin ? (
          <form className="mt-8 space-y-6" onSubmit={loginForm.handleSubmit(handleLogin)}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="email" className="sr-only">
                  Email
                </label>
                <input
                  {...loginForm.register('email')}
                  type="email"
                  autoComplete="email"
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                  placeholder="Emailová adresa"
                />
                {loginForm.formState.errors.email && (
                  <p className="mt-1 text-sm text-red-600">{loginForm.formState.errors.email.message}</p>
                )}
              </div>
              <div className="relative">
                <label htmlFor="password" className="sr-only">
                  Heslo
                </label>
                <input
                  {...loginForm.register('password')}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="appearance-none rounded-none relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                  placeholder="Heslo"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
                {loginForm.formState.errors.password && (
                  <p className="mt-1 text-sm text-red-600">{loginForm.formState.errors.password.message}</p>
                )}
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
              >
                {loading ? 'Prihlasovanie...' : 'Prihlásiť sa'}
              </button>
            </div>
          </form>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={registerForm.handleSubmit(handleRegister)}>
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="form-label">
                  Meno
                </label>
                <input
                  {...registerForm.register('name')}
                  type="text"
                  className="form-input"
                  placeholder="Vaše meno"
                />
                {registerForm.formState.errors.name && (
                  <p className="mt-1 text-sm text-red-600">{registerForm.formState.errors.name.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="form-label">
                  Email
                </label>
                <input
                  {...registerForm.register('email')}
                  type="email"
                  className="form-input"
                  placeholder="email@example.com"
                />
                {registerForm.formState.errors.email && (
                  <p className="mt-1 text-sm text-red-600">{registerForm.formState.errors.email.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="role" className="form-label">
                  Rola
                </label>
                <select {...registerForm.register('role')} className="form-input">
                  <option value="">Vyberte rolu</option>
                  <option value="owner">Majiteľ psa</option>
                  <option value="trainer">Tréner</option>
                </select>
                {registerForm.formState.errors.role && (
                  <p className="mt-1 text-sm text-red-600">{registerForm.formState.errors.role.message}</p>
                )}
              </div>

              <div className="relative">
                <label htmlFor="password" className="form-label">
                  Heslo
                </label>
                <input
                  {...registerForm.register('password')}
                  type={showPassword ? 'text' : 'password'}
                  className="form-input pr-10"
                  placeholder="Minimálne 6 znakov"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center mt-6"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
                {registerForm.formState.errors.password && (
                  <p className="mt-1 text-sm text-red-600">{registerForm.formState.errors.password.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="password_confirmation" className="form-label">
                  Potvrdiť heslo
                </label>
                <input
                  {...registerForm.register('password_confirmation')}
                  type="password"
                  className="form-input"
                  placeholder="Zopakujte heslo"
                />
                {registerForm.formState.errors.password_confirmation && (
                  <p className="mt-1 text-sm text-red-600">{registerForm.formState.errors.password_confirmation.message}</p>
                )}
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
              >
                {loading ? 'Registrovanie...' : 'Zaregistrovať sa'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
} 