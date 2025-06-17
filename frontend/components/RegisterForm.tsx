import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FaEye, FaEyeSlash, FaDog, FaUserPlus, FaUser, FaChalkboardTeacher } from 'react-icons/fa';
import TrainerSelector from './TrainerSelector';

export default function RegisterForm({ onToggleMode }: { onToggleMode: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'owner' as 'owner' | 'trainer',
    trainerId: null as string | null,
    requestMessage: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // 1 = basic info, 2 = trainer selection (for owners)
  
  const { register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // If owner and step 1, proceed to trainer selection
    if (formData.role === 'owner' && step === 1) {
      setStep(2);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // For trainers, register directly
      if (formData.role === 'trainer') {
        await register(formData.name, formData.email, formData.password, formData.role);
      } else {
        // For owners, register and optionally request trainer relationship
        await register(formData.name, formData.email, formData.password, formData.role, formData.trainerId, formData.requestMessage);
      }
    } catch (err: any) {
      setError(err.message || 'Registrácia sa nepodarila');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleBackToStep1 = () => {
    setStep(1);
    setError('');
  };

  const renderStep1 = () => (
    <>
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
          Meno
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          value={formData.name}
          onChange={handleInputChange}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
          placeholder="Vaše meno"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          value={formData.email}
          onChange={handleInputChange}
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
            name="password"
            type={showPassword ? 'text' : 'password'}
            required
            value={formData.password}
            onChange={handleInputChange}
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

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Typ účtu
        </label>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, role: 'owner' }))}
            className={`p-4 border-2 rounded-lg text-center transition-all duration-200 ${
              formData.role === 'owner'
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <FaUser className="mx-auto mb-2 text-2xl" />
            <div className="font-semibold">Majiteľ</div>
            <div className="text-xs text-gray-500">Majím psa</div>
          </button>
          
          <button
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, role: 'trainer' }))}
            className={`p-4 border-2 rounded-lg text-center transition-all duration-200 ${
              formData.role === 'trainer'
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <FaChalkboardTeacher className="mx-auto mb-2 text-2xl" />
            <div className="font-semibold">Tréner</div>
            <div className="text-xs text-gray-500">Trénujem psov</div>
          </button>
        </div>
      </div>
    </>
  );

  const renderStep2 = () => (
    <>
      <TrainerSelector
        selectedTrainerId={formData.trainerId}
        onSelect={(trainerId) => setFormData(prev => ({ ...prev, trainerId }))}
        required={false}
      />

      {formData.trainerId && (
        <div>
          <label htmlFor="requestMessage" className="block text-sm font-medium text-gray-700 mb-2">
            Správa pre trénera (voliteľné)
          </label>
          <textarea
            id="requestMessage"
            name="requestMessage"
            rows={3}
            value={formData.requestMessage}
            onChange={handleInputChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
            placeholder="Napíšte trénerovi správu o vašich potrebách..."
          />
        </div>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-white to-purple-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md transform hover:scale-105 transition-transform duration-300">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full mb-4">
            <FaDog className="text-white text-2xl" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {step === 1 ? 'Vytvorte účet' : 'Výber trénera'}
          </h2>
          <p className="text-gray-600">
            {step === 1 ? 'Pridajte sa k našej komunite' : 'Vyberte si svojho trénera'}
          </p>
          
          {step === 2 && (
            <div className="flex justify-center mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
                <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {step === 1 ? renderStep1() : renderStep2()}

          <div className="flex gap-3">
            {step === 2 && (
              <button
                type="button"
                onClick={handleBackToStep1}
                className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-lg font-semibold hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transform transition-all duration-200"
              >
                Späť
              </button>
            )}
            
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-3 px-4 rounded-lg font-semibold hover:from-indigo-600 hover:to-purple-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transform transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <FaUserPlus />
                  {step === 1 && formData.role === 'owner' ? 'Pokračovať' : 'Zaregistrovať sa'}
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-8 text-center">
          <p className="text-gray-600">
            Už máte účet?{' '}
            <button
              onClick={onToggleMode}
              className="text-indigo-500 font-semibold hover:text-indigo-600 transition-colors"
            >
              Prihláste sa
            </button>
          </p>
        </div>
      </div>
    </div>
  );
} 