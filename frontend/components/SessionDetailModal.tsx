import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { XMarkIcon, PlusIcon, PlayIcon, StopIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { sessionApi, dogApi } from '../lib/api';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { sk } from 'date-fns/locale';
import WaitlistButton from './WaitlistButton';

interface Session {
  id: string;
  title: string;
  description?: string;
  session_type: 'individual' | 'group' | 'daycare';
  start_time: string;
  end_time: string;
  capacity: number;
  current_signups?: number;
  available_spots?: number;
  status: string;
  price: number;
  signups?: any[];
  waitlist?: any[];
}

interface SessionDetailModalProps {
  session: Session;
  onClose: () => void;
}

export default function SessionDetailModal({ session, onClose }: SessionDetailModalProps) {
  const { token, user } = useAuth();
  const [showSignupForm, setShowSignupForm] = useState(false);
  const [selectedDogId, setSelectedDogId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  // Mutation for starting session
  const startSessionMutation = useMutation({
    mutationFn: () => sessionApi.update(token!, parseInt(session.id), { status: 'active' }),
    onSuccess: () => {
      toast.success('Tréning bol úspešne spustený');
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['session', session.id] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Chyba pri spustení tréningu');
    }
  });

  // Mutation for ending session
  const endSessionMutation = useMutation({
    mutationFn: () => sessionApi.update(token!, parseInt(session.id), { status: 'completed' }),
    onSuccess: () => {
      toast.success('Tréning bol úspešne ukončený');
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['session', session.id] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Chyba pri ukončení tréningu');
    }
  });

  const { data: dogsResponse } = useQuery({
    queryKey: ['dogs'],
    queryFn: () => dogApi.list(token!),
    enabled: !!token && user?.role === 'owner',
  });

  const dogs = dogsResponse?.data?.dogs || [];

  const handleSignup = async () => {
    if (!selectedDogId) {
      toast.error('Vyberte psa');
      return;
    }

    setLoading(true);
    try {
      console.log('Signing up dog:', { sessionId: session.id, dogId: selectedDogId });
      await sessionApi.signup(token!, session.id, selectedDogId!);
      toast.success('Pes bol úspešne prihlásený na reláciu - čaká na schválenie trénera');
      queryClient.invalidateQueries({ queryKey: ['session', session.id] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      setShowSignupForm(false);
      setSelectedDogId(null);
    } catch (error: any) {
      console.error('Signup error:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Chyba pri prihlasovaní psa';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const isOwner = user?.role === 'owner';
  const isTrainer = user?.role === 'trainer';
  
  // Calculate current signups from session data
  const currentSignups = session.signups?.filter((signup: any) => signup.status === 'approved').length || 0;
  const isFull = currentSignups >= session.capacity;
  const canSignup = isOwner && (session.status === 'scheduled' || session.status === 'active') && !isFull;

  // Session control handlers
  const handleStartSession = () => {
    if (!isFull) {
      toast.error('Tréning môže byť spustený len ak sú všetky miesta obsadené');
      return;
    }
    startSessionMutation.mutate();
  };

  const handleEndSession = () => {
    endSessionMutation.mutate();
  };

  // Check if session can be started (must be full)
  const canStartSession = isTrainer && session.status === 'scheduled' && isFull;
  const canEndSession = isTrainer && session.status === 'active';

  // Enhanced debug logging
  console.log('SessionDetailModal Debug:', {
    user: user,
    isOwner,
    isTrainer,
    sessionStatus: session.status,
    sessionId: session.id,
    sessionTitle: session.title,
    isFull,
    currentSignups,
    capacity: session.capacity,
    canSignup,
    dogs: dogs,
    dogsLength: dogs.length
  });

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-2xl">
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-lg font-medium text-gray-900">
            Detail relácie: {session.title}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Session Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="font-medium text-gray-700">Typ:</span>
                <div className="text-gray-900">
                  {session.session_type === 'group' ? 'Skupinový tréning' : 
                   session.session_type === 'individual' ? 'Individuálny tréning' : 'Jasle'}
                </div>
              </div>
              <div>
                <span className="font-medium text-gray-700">Stav:</span>
                <div className="text-gray-900">{session.status}</div>
              </div>
              <div>
                <span className="font-medium text-gray-700">Začiatok:</span>
                <div className="text-gray-900">
                  {format(new Date(session.start_time), 'dd.MM.yyyy HH:mm', { locale: sk })}
                </div>
              </div>
              <div>
                <span className="font-medium text-gray-700">Koniec:</span>
                <div className="text-gray-900">
                  {format(new Date(session.end_time), 'dd.MM.yyyy HH:mm', { locale: sk })}
                </div>
              </div>
              <div>
                <span className="font-medium text-gray-700">Kapacita:</span>
                <div className="text-gray-900">
                  <span className={isFull ? 'text-red-600' : 'text-green-600'}>
                    {currentSignups}/{session.capacity}
                  </span>
                </div>
              </div>
            </div>

            {session.description && (
              <div className="mt-4">
                <span className="font-medium text-gray-700">Popis:</span>
                <p className="text-gray-900 mt-1">{session.description}</p>
              </div>
            )}
          </div>

          {/* Trainer Session Controls */}
          {isTrainer && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                <PlayIcon className="h-5 w-5 text-blue-600 mr-2" />
                Ovládanie tréningu
              </h4>
              
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  {!isFull && session.status === 'scheduled' && (
                    <p className="text-amber-600">
                      ⚠️ Tréning môže byť spustený len ak sú všetky miesta obsadené ({currentSignups}/{session.capacity})
                    </p>
                  )}
                  {isFull && session.status === 'scheduled' && (
                    <p className="text-green-600">
                      ✅ Tréning je pripravený na spustenie - všetky miesta sú obsadené
                    </p>
                  )}
                  {session.status === 'active' && (
                    <p className="text-blue-600">
                      🏃‍♂️ Tréning prebieha - môžete ho ukončiť
                    </p>
                  )}
                  {session.status === 'completed' && (
                    <p className="text-gray-600">
                      ✅ Tréning bol ukončený
                    </p>
                  )}
                </div>
                
                <div className="flex space-x-2">
                  {canStartSession && (
                    <button
                      onClick={handleStartSession}
                      disabled={startSessionMutation.isPending}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center transition-colors"
                    >
                      <PlayIcon className="h-4 w-4 mr-2" />
                      {startSessionMutation.isPending ? 'Spúšťa sa...' : 'Spustiť tréning'}
                    </button>
                  )}
                  
                  {canEndSession && (
                    <button
                      onClick={handleEndSession}
                      disabled={endSessionMutation.isPending}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center transition-colors"
                    >
                      <StopIcon className="h-4 w-4 mr-2" />
                      {endSessionMutation.isPending ? 'Ukončuje sa...' : 'Ukončiť tréning'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}



          {/* Owner Actions - ALWAYS SHOW FOR OWNERS */}
          {isOwner && (
            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-3">Prihlásiť psa</h4>
              
              {canSignup ? (
                <div className="space-y-3">
                  {!showSignupForm ? (
                    <button
                      onClick={() => setShowSignupForm(true)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Prihlásiť psa na reláciu
                    </button>
                  ) : (
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Vyberte psa</label>
                        <select
                          value={selectedDogId || ''}
                          onChange={(e) => setSelectedDogId(e.target.value)}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                          <option value="">Vyberte psa</option>
                          {dogs.map((dog: any) => (
                            <option key={dog.id} value={dog.id}>
                              {dog.name} ({dog.breed})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={handleSignup}
                          disabled={loading || !selectedDogId}
                          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                          {loading ? 'Prihlasovanie...' : 'Prihlásiť'}
                        </button>
                        <button
                          onClick={() => {
                            setShowSignupForm(false);
                            setSelectedDogId(null);
                          }}
                          className="border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-50"
                        >
                          Zrušiť
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  {isFull ? (
                    <div>
                      <p className="text-gray-600 mb-3">Relácia je naplnená</p>
                      <WaitlistButton sessionId={session.id} />
                    </div>
                  ) : (
                    <div>
                      <p className="text-gray-600 mb-2">Prihlasovanie nie je možné</p>
                      <p className="text-sm text-gray-500">Status: {session.status}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Participants List (for trainers) */}
          {isTrainer && session.signups && (
            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-3">
                Prihlásení účastníci ({session.signups.length})
              </h4>
              
              {session.signups.length === 0 ? (
                <p className="text-gray-500">Zatiaľ nie sú prihlásení žiadni účastníci</p>
              ) : (
                <div className="space-y-2">
                  {session.signups.map((signup: any) => (
                    <div key={signup.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900">{signup.dog.name}</div>
                        <div className="text-sm text-gray-600">
                          {signup.dog.breed} • Majiteľ: {signup.dog.owner.name}
                        </div>
                      </div>
                      <span className={`
                        px-2 py-1 text-xs rounded-full
                        ${signup.status === 'approved' ? 'bg-green-100 text-green-800' : 
                          signup.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'}
                      `}>
                        {signup.status === 'approved' ? 'Schválený' :
                         signup.status === 'pending' ? 'Čaká na schválenie' :
                         'Zamietnutý'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {session.waitlist && session.waitlist.length > 0 && (
                <div className="mt-4">
                  <h5 className="font-medium text-gray-900 mb-2">
                    Čakacia listina ({session.waitlist.length})
                  </h5>
                  <div className="space-y-2">
                    {session.waitlist.map((waitlist: any) => (
                      <div key={waitlist.id} className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                        <div>
                          <span className="font-medium">{waitlist.dog.name}</span>
                          <span className="text-sm text-gray-600 ml-2">
                            • {waitlist.dog.breed} • {waitlist.dog.owner.name}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          Pozícia #{waitlist.position}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 