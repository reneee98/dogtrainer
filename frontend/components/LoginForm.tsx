import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FaEye, FaEyeSlash, FaDog, FaSignInAlt } from 'react-icons/fa';

export default function LoginForm({ onToggleMode }: { onToggleMode: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Prihlásenie sa nepodarilo');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-white to-purple-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md transform hover:scale-105 transition-transform duration-300">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full mb-4">
            <FaDog className="text-white text-2xl" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Vitajte späť!</h2>
          <p className="text-gray-600">Prihláste sa do svojho účtu</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
              placeholder="váš@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Heslo
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-3 px-4 rounded-lg font-semibold hover:from-indigo-600 hover:to-purple-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transform transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                <FaSignInAlt />
                Prihlásiť sa
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-gray-600">
            Nemáte účet?{' '}
            <button
              onClick={onToggleMode}
              className="text-indigo-500 font-semibold hover:text-indigo-600 transition-colors"
            >
              Zaregistrujte sa
            </button>
          </p>
        </div>
      </div>
    </div>
  );
} 