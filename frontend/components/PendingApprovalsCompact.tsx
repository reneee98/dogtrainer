import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ClockIcon, 
  CheckIcon, 
  XMarkIcon,
  UserIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { sessionApi } from '../lib/api';
import { format } from 'date-fns';
import { sk } from 'date-fns/locale';
import SessionForm from './SessionForm';

interface PendingSignup {
  id: string;
  session_id: string;
  dog: {
    name: string;
    owner: {
      name: string;
    };
  };
  session: {
    title: string;
    start_time: string;
  };
}

export default function PendingApprovalsCompact() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showSessionForm, setShowSessionForm] = useState(false);

  // Fetch sessions with pending signups
  const { data: sessions, isLoading } = useQuery({
    queryKey: ['sessions-pending-compact'],
    queryFn: () => sessionApi.list(token!),
    enabled: !!token,
  });

  // Extract pending signups from all sessions
  const pendingSignups: PendingSignup[] = [];
  let sessionsList = sessions;
  
  if (sessions && !Array.isArray(sessions)) {
    if (sessions.data && Array.isArray(sessions.data)) {
      sessionsList = sessions.data;
    }
  }

  // Store sessions map for easy lookup
  const sessionsMap = new Map();
  if (sessionsList && Array.isArray(sessionsList)) {
    sessionsList.forEach((session: any) => {
      sessionsMap.set(session.id, session);
      if (session.signups && Array.isArray(session.signups)) {
        session.signups.forEach((signup: any) => {
          if (signup.status === 'pending') {
            pendingSignups.push({
              id: signup.id,
              session_id: session.id,
              dog: signup.dog,
              session: {
                title: session.title,
                start_time: session.start_time,
              },
            });
          }
        });
      }
    });
  }

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: ({ sessionId, signupId }: { sessionId: string; signupId: string }) =>
      sessionApi.approveSignup(token!, sessionId, signupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions-pending-compact'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: ({ sessionId, signupId }: { sessionId: string; signupId: string }) =>
      sessionApi.rejectSignup(token!, sessionId, signupId, 'Zamietnuté'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions-pending-compact'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });

  const handleApprove = (sessionId: string, signupId: string) => {
    approveMutation.mutate({ sessionId, signupId });
  };

  const handleReject = (sessionId: string, signupId: string) => {
    rejectMutation.mutate({ sessionId, signupId });
  };

  const handleViewSession = (sessionId: string) => {
    const session = sessionsMap.get(sessionId);
    if (session) {
      setSelectedSession(session);
      setShowSessionModal(true);
    }
  };

  const handleCloseSessionModal = () => {
    setShowSessionModal(false);
    setSelectedSession(null);
  };

  const handleEditSession = (session: any) => {
    setSelectedSession(session);
    setShowSessionForm(true);
    setShowSessionModal(false);
  };

  const handleSessionFormClose = () => {
    setShowSessionForm(false);
    setSelectedSession(null);
  };

  const handleSessionFormSuccess = () => {
    setShowSessionForm(false);
    setSelectedSession(null);
    // Refresh data
    queryClient.invalidateQueries({ queryKey: ['sessions-pending-compact'] });
    queryClient.invalidateQueries({ queryKey: ['sessions'] });
  };

  const handleApproveSignup = async (sessionId: string, signupId: string) => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/sessions/${sessionId}/signups/${signupId}/approve`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['sessions-pending-compact'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      
    } catch (error) {
      console.error('Failed to approve signup:', error);
      alert('Chyba pri schvaľovaní prihlášky');
    }
  };

  const handleRejectSignup = async (sessionId: string, signupId: string) => {
    const reason = window.prompt('Dôvod zamietnutia (nepovinné):');
    
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/sessions/${sessionId}/signups/${signupId}/reject`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: reason || '' }),
      });
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['sessions-pending-compact'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      
    } catch (error) {
      console.error('Failed to reject signup:', error);
      alert('Chyba pri zamietnutí prihlášky');
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!window.confirm('Ste si istí, že chcete zmazať tento tréning?')) {
      return;
    }

    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      setShowSessionModal(false);
      setSelectedSession(null);
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['sessions-pending-compact'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      alert('Tréning bol úspešne zmazaný');
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Chyba pri mazaní tréningu');
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <ClockIcon className="h-5 w-5 text-amber-600 mr-2" />
            Čakajúce schválenia
          </h3>
        </div>
        <div className="p-6">
          <div className="animate-pulse space-y-2">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (pendingSignups.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <CheckIcon className="h-5 w-5 text-green-600 mr-2" />
            Čakajúce schválenia
          </h3>
        </div>
        <div className="p-6">
          <div className="text-center py-8">
            <CheckIcon className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Všetko spracované</h3>
            <p className="mt-1 text-sm text-gray-500">Žiadne čakajúce schválenia.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <ClockIcon className="h-5 w-5 text-amber-600 mr-2" />
            Čakajúce schválenia
          </h3>
          <span className="bg-amber-100 text-amber-800 text-xs font-medium px-2 py-1 rounded-full">
            {pendingSignups.length}
          </span>
        </div>
      </div>
      
      <div className="p-6">
        <div className="space-y-4 max-h-64 overflow-y-auto">
          {pendingSignups.map((signup) => (
            <div
              key={signup.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900">{signup.dog?.name}</div>
                <div className="text-sm text-gray-600 mt-1">
                  {signup.dog?.owner?.name}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {signup.session?.title} • {format(new Date(signup.session?.start_time), 'dd.MM HH:mm', { locale: sk })}
                </div>
              </div>
              
              <div className="flex space-x-2 ml-2 flex-shrink-0">
                <button
                  onClick={() => handleViewSession(signup.session_id)}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  title="Zobraziť detail"
                >
                  <EyeIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleApprove(signup.session_id, signup.id)}
                  disabled={approveMutation.isPending}
                  className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                  title="Schváliť"
                >
                  <CheckIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleReject(signup.session_id, signup.id)}
                  disabled={rejectMutation.isPending}
                  className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                  title="Zamietnuť"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Session Detail Modal */}
      {showSessionModal && selectedSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg sm:w-full max-h-[90vh] sm:max-h-[90vh] overflow-hidden">
            {/* Mobile handle bar */}
            <div className="flex justify-center py-3 sm:hidden">
              <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
            </div>

            <div className="overflow-y-auto max-h-[85vh] sm:max-h-[80vh]">
              <div className="p-4 sm:p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                      <h3 className="text-xl sm:text-2xl font-semibold text-gray-900">
                        {selectedSession.title || 'Tréning'}
                      </h3>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800">
                        Čaká na schválenie
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleCloseSessionModal}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Detaily tréningy</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600">Služba</span>
                        <span className="font-medium text-gray-900">
                          {selectedSession.title || 'Tréning'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600">Dátum</span>
                        <span className="font-medium text-gray-900">
                          {selectedSession.start_time ? format(new Date(selectedSession.start_time), 'dd.MM.yyyy', { locale: sk }) : 'Neurčený'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600">Čas</span>
                        <span className="font-medium text-gray-900">
                          {selectedSession.start_time && selectedSession.end_time 
                            ? `${format(new Date(selectedSession.start_time), 'HH:mm')} - ${format(new Date(selectedSession.end_time), 'HH:mm')}`
                            : 'Neurčený'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600">Miesto</span>
                        <span className="font-medium text-gray-900">{selectedSession.location || 'Neurčené'}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600">Cena</span>
                        <span className="font-medium text-gray-900 text-lg">{selectedSession.price || 0}€</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600">Kapacita</span>
                        <span className="font-medium text-gray-900">
                          {selectedSession.capacity || 0} miest
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-gray-600">Čaká na schválenie</span>
                        <span className="font-medium text-gray-900">
                          {selectedSession.signups?.filter((s: any) => s.status === 'pending').length || 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  {selectedSession.description && (
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-3">Popis tréningy</h4>
                      <p className="text-gray-600 leading-relaxed">{selectedSession.description}</p>
                    </div>
                  )}

                  {selectedSession.signups && selectedSession.signups.length > 0 && (
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-3">
                        Prihlášky na schválenie ({selectedSession.signups.filter((s: any) => s.status === 'pending').length})
                      </h4>
                      <div className="space-y-2">
                        {selectedSession.signups.filter((s: any) => s.status === 'pending').map((signup: any, index: number) => (
                          <div key={index} className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <div className="font-medium text-gray-900">
                                  {signup.dog?.name || 'Neznámy pes'}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {signup.user?.name || signup.dog?.owner?.name || 'Neznámy majiteľ'}
                                </div>
                              </div>
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                Čaká na schválenie
                              </span>
                            </div>
                            
                            <div className="flex space-x-2 mt-2">
                              <button
                                onClick={() => handleApproveSignup(selectedSession.id, signup.id)}
                                className="flex-1 px-3 py-1.5 bg-green-500 text-white text-sm rounded-md hover:bg-green-600 transition-colors"
                              >
                                Schváliť
                              </button>
                              <button
                                onClick={() => handleRejectSignup(selectedSession.id, signup.id)}
                                className="flex-1 px-3 py-1.5 bg-red-500 text-white text-sm rounded-md hover:bg-red-600 transition-colors"
                              >
                                Zamietnuť
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="border-t border-gray-200 pt-6">
                    <div className="flex space-x-3">
                      <button
                        onClick={() => handleEditSession(selectedSession)}
                        className="flex-1 flex items-center justify-center px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 active:bg-blue-700 transition-colors touch-manipulation"
                      >
                        <PencilIcon className="h-5 w-5 mr-2" />
                        Upraviť
                      </button>
                      <button
                        onClick={() => handleDeleteSession(selectedSession.id)}
                        className="flex-1 flex items-center justify-center px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 active:bg-red-700 transition-colors touch-manipulation"
                      >
                        <TrashIcon className="h-5 w-5 mr-2" />
                        Zmazať
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Session Form Modal */}
      {showSessionForm && (
        <SessionForm
          session={selectedSession}
          onClose={handleSessionFormClose}
          onSuccess={handleSessionFormSuccess}
        />
      )}
    </div>
  );
} 