import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../contexts/AuthContext';
import { dogApi, sessionApi, apiRequest } from '../lib/api';
import { toast } from 'react-toastify';
import { 
  CheckIcon, 
  ChevronRightIcon, 
  ChevronLeftIcon, 
  XMarkIcon,
  PlusIcon,
  UserIcon,
  CalendarIcon,
  HeartIcon
} from '@heroicons/react/24/outline';

// Schemas for validation
const dogSchema = z.object({
  name: z.string().min(2, 'Meno musí mať aspoň 2 znaky'),
  breed: z.string().min(2, 'Plemeno musí mať aspoň 2 znaky'),
  age: z.number().min(0, 'Vek musí byť kladné číslo').max(30, 'Vek je príliš vysoký'),
  weight: z.number().min(0.1, 'Váha musí byť kladné číslo').max(150, 'Váha je príliš vysoká'),
  medical_notes: z.string().optional(),
  behavioral_notes: z.string().optional(),
});

type DogFormData = z.infer<typeof dogSchema>;

interface Session {
  id: string;
  title: string;
  description?: string;
  location: string;
  start_time: string;
  end_time: string;
  capacity: number;
  price: number;
  session_type: 'individual' | 'group' | 'daycare';
  status: string;
  trainer: {
    id: string;
    name: string;
  };
  signups?: any[];
}

interface OwnerOnboardingFlowProps {
  onComplete: () => void;
  onClose: () => void;
}

const STEPS = [
  { id: 'welcome', title: 'Vitajte', icon: HeartIcon },
  { id: 'dog-profile', title: 'Profil psa', icon: PlusIcon },
  { id: 'trainer-selection', title: 'Výber trénera', icon: UserIcon },
  { id: 'training-signup', title: 'Rezervácia', icon: CalendarIcon },
  { id: 'complete', title: 'Hotovo', icon: CheckIcon },
];

export default function OwnerOnboardingFlow({ onComplete, onClose }: OwnerOnboardingFlowProps) {
  const { user, token } = useAuth();
  const [currentStep, setCurrentStep] = useState('welcome');
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  
  // State for created dog
  const [createdDog, setCreatedDog] = useState<any>(null);
  
  // State for available sessions and selected session
  const [availableSessions, setAvailableSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  
  // State for trainers
  const [trainers, setTrainers] = useState<any[]>([]);
  const [selectedTrainer, setSelectedTrainer] = useState<any>(null);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<DogFormData>({
    resolver: zodResolver(dogSchema),
    defaultValues: {
      name: '',
      breed: '',
      age: 0,
      weight: 0,
      medical_notes: '',
      behavioral_notes: '',
    },
  });

  // Load trainers on component mount
  useEffect(() => {
    const loadTrainers = async () => {
      try {
        const response = await apiRequest('/public/trainers', { token });
        const trainersData = response.data?.data || response.data || [];
        setTrainers(Array.isArray(trainersData) ? trainersData : []);
      } catch (error) {
        console.error('Error loading trainers:', error);
        toast.error('Nepodarilo sa načítať zoznam trénerov');
      }
    };

    loadTrainers();
  }, [token]);

  // Load sessions when trainer is selected
  useEffect(() => {
    if (selectedTrainer) {
      loadTrainerSessions();
    }
  }, [selectedTrainer]);

  const loadTrainerSessions = async () => {
    if (!selectedTrainer) return;
    
    try {
      setLoading(true);
      const response = await apiRequest('/sessions', { token });
      
      // Filter sessions by selected trainer and future dates
      const now = new Date();
      const filtered = (response.data || []).filter((session: Session) => {
        const sessionDate = new Date(session.start_time);
        return session.trainer?.id === selectedTrainer.id && 
               sessionDate > now &&
               session.status === 'scheduled' &&
               (session.signups?.length || 0) < session.capacity;
      });
      
      setAvailableSessions(filtered);
    } catch (error) {
      console.error('Error loading sessions:', error);
      toast.error('Nepodarilo sa načítať tréningy');
    } finally {
      setLoading(false);
    }
  };

  const handleDogCreate = async (data: DogFormData) => {
    setLoading(true);
    try {
      const response = await dogApi.create(token!, data);
      if (response.success) {
        setCreatedDog(response.data.dog);
        setCompletedSteps(prev => [...prev, 'dog-profile']);
        toast.success('Profil psa bol vytvorený!');
        setCurrentStep('trainer-selection');
      } else {
        toast.error(response.message || 'Chyba pri vytváraní profilu psa');
      }
    } catch (error: any) {
      toast.error(error.message || 'Chyba pri vytváraní profilu psa');
    } finally {
      setLoading(false);
    }
  };

  const handleTrainerSelect = (trainer: any) => {
    setSelectedTrainer(trainer);
    setCompletedSteps(prev => [...prev, 'trainer-selection']);
    setCurrentStep('training-signup');
  };

  const handleSessionSignup = async (session: Session) => {
    if (!createdDog) {
      toast.error('Najprv musíte vytvoriť profil psa');
      return;
    }

    setLoading(true);
    try {
      const response = await sessionApi.signup(token!, parseInt(session.id), createdDog.id);
      if (response.success) {
        setSelectedSession(session);
        setCompletedSteps(prev => [...prev, 'training-signup']);
        toast.success('Úspešne ste sa prihlásili na tréning!');
        setCurrentStep('complete');
      } else {
        toast.error(response.message || 'Chyba pri prihlasovaní na tréning');
      }
    } catch (error: any) {
      toast.error(error.message || 'Chyba pri prihlasovaní na tréning');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    const currentIndex = STEPS.findIndex(step => step.id === currentStep);
    if (currentIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[currentIndex + 1].id);
    }
  };

  const handleBack = () => {
    const currentIndex = STEPS.findIndex(step => step.id === currentStep);
    if (currentIndex > 0) {
      setCurrentStep(STEPS[currentIndex - 1].id);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('sk-SK', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('sk-SK', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'welcome':
        return (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto">
              <HeartIcon className="w-10 h-10 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Vitajte v Dog Booking System!
              </h2>
              <p className="text-gray-600 leading-relaxed">
                Sme radi, že ste sa k nám pridali. Tento jednoduchý sprievodca vám pomôže:
              </p>
            </div>
            
            <div className="space-y-4 text-left">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 text-sm font-medium">1</span>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Vytvoriť profil vašeho psa</h3>
                  <p className="text-sm text-gray-600">Základné informácie o vašom štvornohom kamarátovi</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 text-sm font-medium">2</span>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Vybrať si trénera</h3>
                  <p className="text-sm text-gray-600">Nájdite vhodného trénera pre vášho psa</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 text-sm font-medium">3</span>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Rezervovať prvý tréning</h3>
                  <p className="text-sm text-gray-600">Prihláste sa na tréning, ktorý sa vám páči</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleNext}
              className="btn btn-primary flex items-center space-x-2 mx-auto"
            >
              <span>Začať</span>
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>
        );

      case 'dog-profile':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <PlusIcon className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Vytvorte profil vašeho psa
              </h2>
              <p className="text-gray-600">
                Zadajte základné informácie o vašom psovi. Tieto údaje pomôžu trénerom lepšie pochopiť potreby vášho psa.
              </p>
            </div>

            <form onSubmit={handleSubmit(handleDogCreate)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Meno psa</label>
                  <input
                    {...register('name')}
                    type="text"
                    className="form-input"
                    placeholder="Rex"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="form-label">Plemeno</label>
                  <input
                    {...register('breed')}
                    type="text"
                    className="form-input"
                    placeholder="Nemecký ovčiak"
                  />
                  {errors.breed && (
                    <p className="mt-1 text-sm text-red-600">{errors.breed.message}</p>
                  )}
                </div>

                <div>
                  <label className="form-label">Vek (roky)</label>
                  <input
                    {...register('age', { valueAsNumber: true })}
                    type="number"
                    min="0"
                    max="30"
                    className="form-input"
                    placeholder="3"
                  />
                  {errors.age && (
                    <p className="mt-1 text-sm text-red-600">{errors.age.message}</p>
                  )}
                </div>

                <div>
                  <label className="form-label">Váha (kg)</label>
                  <input
                    {...register('weight', { valueAsNumber: true })}
                    type="number"
                    min="0.1"
                    max="150"
                    step="0.1"
                    className="form-input"
                    placeholder="25.5"
                  />
                  {errors.weight && (
                    <p className="mt-1 text-sm text-red-600">{errors.weight.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="form-label">Zdravotné poznámky (voliteľné)</label>
                <textarea
                  {...register('medical_notes')}
                  rows={3}
                  className="form-input"
                  placeholder="Alergie, lieky, zdravotné problémy..."
                />
              </div>

              <div>
                <label className="form-label">Behaviorálne poznámky (voliteľné)</label>
                <textarea
                  {...register('behavioral_notes')}
                  rows={3}
                  className="form-input"
                  placeholder="Správanie, zvyky, špecifické potreby..."
                />
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={handleBack}
                  className="btn btn-outline flex items-center space-x-2"
                >
                  <ChevronLeftIcon className="w-4 h-4" />
                  <span>Späť</span>
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary disabled:opacity-50 flex items-center space-x-2"
                >
                  <span>{loading ? 'Vytváram...' : 'Vytvoriť profil'}</span>
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        );

      case 'trainer-selection':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserIcon className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Vyberte si trénera
              </h2>
              <p className="text-gray-600">
                Vyberte trénera, ktorý sa vám páči. Po výbere uvidíte dostupné tréningy.
              </p>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {trainers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <UserIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>Žiadni tréneri k dispozícii</p>
                </div>
              ) : (
                trainers.map((trainer) => (
                  <div
                    key={trainer.id}
                    onClick={() => handleTrainerSelect(trainer)}
                    className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                      selectedTrainer?.id === trainer.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                        <UserIcon className="w-6 h-6 text-gray-500" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{trainer.name}</h3>
                        {trainer.bio && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {trainer.bio}
                          </p>
                        )}
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                          {trainer.received_reviews_avg_rating && (
                            <span>⭐ {trainer.received_reviews_avg_rating.toFixed(1)}</span>
                          )}
                          <span>{trainer.client_relationships_count} klientov</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={handleBack}
                className="btn btn-outline flex items-center space-x-2"
              >
                <ChevronLeftIcon className="w-4 h-4" />
                <span>Späť</span>
              </button>
              
              {selectedTrainer && (
                <button
                  onClick={handleNext}
                  className="btn btn-primary flex items-center space-x-2"
                >
                  <span>Pokračovať</span>
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        );

      case 'training-signup':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <CalendarIcon className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Vyberte si tréning
              </h2>
              <p className="text-gray-600">
                Dostupné tréningy od trénera <strong>{selectedTrainer?.name}</strong>
              </p>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="text-gray-600 mt-2">Načítavam tréningy...</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {availableSessions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CalendarIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>Žiadne dostupné tréningy</p>
                    <p className="text-sm">Skúste to znovu neskôr</p>
                  </div>
                ) : (
                  availableSessions.map((session) => (
                    <div
                      key={session.id}
                      className="border rounded-lg p-4 hover:shadow-md transition-all cursor-pointer hover:border-gray-400"
                      onClick={() => handleSessionSignup(session)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{session.title}</h3>
                          {session.description && (
                            <p className="text-sm text-gray-600 mt-1">{session.description}</p>
                          )}
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                            <span>📅 {formatDate(session.start_time)}</span>
                            <span>🕒 {formatTime(session.start_time)} - {formatTime(session.end_time)}</span>
                            <span>📍 {session.location}</span>
                          </div>
                          <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                            <span>👥 {session.signups?.length || 0}/{session.capacity}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs ${
                              session.session_type === 'individual' ? 'bg-blue-100 text-blue-800' :
                              session.session_type === 'group' ? 'bg-green-100 text-green-800' :
                              'bg-purple-100 text-purple-800'
                            }`}>
                              {session.session_type === 'individual' ? 'Individuálny' :
                               session.session_type === 'group' ? 'Skupinový' : 'Denný pobyt'}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold text-gray-900">{session.price}€</div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSessionSignup(session);
                            }}
                            disabled={loading}
                            className="btn btn-primary btn-sm mt-2 disabled:opacity-50"
                          >
                            {loading ? 'Prihlasovanie...' : 'Prihlásiť'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={handleBack}
                className="btn btn-outline flex items-center space-x-2"
              >
                <ChevronLeftIcon className="w-4 h-4" />
                <span>Späť</span>
              </button>
              
              <button
                type="button"
                onClick={() => setCurrentStep('complete')}
                className="btn btn-outline"
              >
                Preskočiť zatiaľ
              </button>
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center mx-auto">
              <CheckIcon className="w-10 h-10 text-white" />
            </div>
            
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Gratulujeme! 🎉
              </h2>
              <p className="text-gray-600 leading-relaxed">
                Úspešne ste dokončili nastavenie vášho účtu.
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
              <h3 className="font-medium text-green-900">Čo ste dokončili:</h3>
              
              {createdDog && (
                <div className="flex items-center space-x-2 text-green-800">
                  <CheckIcon className="w-4 h-4" />
                  <span>Vytvorili ste profil pre {createdDog.name}</span>
                </div>
              )}
              
              {selectedTrainer && (
                <div className="flex items-center space-x-2 text-green-800">
                  <CheckIcon className="w-4 h-4" />
                  <span>Vybrali ste si trénera {selectedTrainer.name}</span>
                </div>
              )}
              
              {selectedSession && (
                <div className="flex items-center space-x-2 text-green-800">
                  <CheckIcon className="w-4 h-4" />
                  <span>Prihlásili ste sa na tréning: {selectedSession.title}</span>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Teraz môžete preskúmať všetky funkcie platformy v hlavnom menu.
              </p>
              
              <button
                onClick={onComplete}
                className="btn btn-primary w-full flex items-center justify-center space-x-2"
              >
                <span>Prejsť na dashboard</span>
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-6">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">Nastavenie účtu</h1>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
          
          {/* Progress indicator */}
          <div className="mt-4">
            <div className="flex items-center space-x-2 overflow-x-auto">
              {STEPS.map((step, index) => {
                const isActive = step.id === currentStep;
                const isCompleted = completedSteps.includes(step.id);
                const IconComponent = step.icon;
                
                return (
                  <div key={step.id} className="flex items-center flex-shrink-0">
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center transition-all
                      ${isActive ? 'bg-white text-blue-500' :
                        isCompleted ? 'bg-green-500 text-white' :
                        'bg-white bg-opacity-30 text-white'}
                    `}>
                      {isCompleted ? (
                        <CheckIcon className="w-4 h-4" />
                      ) : (
                        <IconComponent className="w-4 h-4" />
                      )}
                    </div>
                    
                    <span className={`
                      ml-2 text-sm font-medium hidden sm:block
                      ${isActive ? 'text-white' :
                        isCompleted ? 'text-green-100' :
                        'text-white text-opacity-70'}
                    `}>
                      {step.title}
                    </span>
                    
                    {index < STEPS.length - 1 && (
                      <ChevronRightIcon className="w-4 h-4 text-white text-opacity-50 mx-2 hidden sm:block" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {renderStepContent()}
        </div>
      </div>
    </div>
  );
} 