import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { XMarkIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { sessionApi, dogApi } from '../lib/api';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { sk } from 'date-fns/locale';
import WaitlistButton from './WaitlistButton';

interface Session {
  id: number;
  name: string;
  description?: string;
  type: 'group_training' | 'daycare';
  start_time: string;
  end_time: string;
  capacity: number;
  current_signups: number;
  status: string;
  price: number;
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

  const { data: sessionDetails } = useQuery({
    queryKey: ['session', session.id],
    queryFn: () => sessionApi.show(token!, session.id),
    enabled: !!token,
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
      await sessionApi.signup(token!, session.id, selectedDogId!);
      toast.success('Pes bol úspešne prihlásený na reláciu');
      queryClient.invalidateQueries({ queryKey: ['session', session.id] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      setShowSignupForm(false);
      setSelectedDogId(null);
    } catch (error) {
      toast.error('Chyba pri prihlasovaní psa');
    } finally {
      setLoading(false);
    }
  };

  const isOwner = user?.role === 'owner';
  const isTrainer = user?.role === 'trainer';
  const isFull = session.current_signups >= session.capacity;
  const canSignup = isOwner && session.status === 'active' && !isFull;

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-2xl">
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-lg font-medium text-gray-900">
            Detail relácie: {session.name}
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
                  {session.type === 'group_training' ? 'Skupinový tréning' : 'Jasle'}
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
                    {session.current_signups}/{session.capacity}
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

          {/* Owner Actions */}
          {isOwner && session.status === 'active' && (
            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-3">Prihlásiť psa</h4>
              
              {canSignup ? (
                <div className="space-y-3">
                  {!showSignupForm ? (
                    <button
                      onClick={() => setShowSignupForm(true)}
                      className="btn btn-primary flex items-center"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Prihlásiť psa na reláciu
                    </button>
                  ) : (
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="mb-3">
                        <label className="form-label">Vyberte psa</label>
                        <select
                          value={selectedDogId || ''}
                          onChange={(e) => setSelectedDogId(e.target.value)}
                          className="form-input"
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
                          className="btn btn-primary disabled:opacity-50"
                        >
                          {loading ? 'Prihlasovanie...' : 'Prihlásiť'}
                        </button>
                        <button
                          onClick={() => {
                            setShowSignupForm(false);
                            setSelectedDogId(null);
                          }}
                          className="btn btn-outline"
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
                    <p className="text-gray-600">Prihlasovanie nie je možné</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Participants List (for trainers) */}
          {isTrainer && sessionDetails?.signups && (
            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-3">
                Prihlásení účastníci ({sessionDetails.signups.length})
              </h4>
              
              {sessionDetails.signups.length === 0 ? (
                <p className="text-gray-500">Zatiaľ nie sú prihlásení žiadni účastníci</p>
              ) : (
                <div className="space-y-2">
                  {sessionDetails.signups.map((signup: any) => (
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

              {sessionDetails.waitlist && sessionDetails.waitlist.length > 0 && (
                <div className="mt-4">
                  <h5 className="font-medium text-gray-900 mb-2">
                    Čakacia listina ({sessionDetails.waitlist.length})
                  </h5>
                  <div className="space-y-2">
                    {sessionDetails.waitlist.map((waitlist: any) => (
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

        <div className="flex justify-end p-6 border-t">
          <button onClick={onClose} className="btn btn-outline">
            Zavrieť
          </button>
        </div>
      </div>
    </div>
  );
} 