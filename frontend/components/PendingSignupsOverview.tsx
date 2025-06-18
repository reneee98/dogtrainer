import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ClockIcon, 
  CheckIcon, 
  XMarkIcon,
  EyeIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { sessionApi } from '../lib/api';
import { format } from 'date-fns';
import { sk } from 'date-fns/locale';

interface PendingSignup {
  id: string;
  status: string;
  session_id: string;
  signed_up_at: string;
  dog: {
    id: string;
    name: string;
    breed: string;
    owner: {
      id: string;
      name: string;
      email: string;
    };
  };
  session: {
    id: string;
    title: string;
    start_time: string;
    end_time: string;
    capacity: number;
  };
}

export default function PendingSignupsOverview() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [selectedSignup, setSelectedSignup] = useState<PendingSignup | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Fetch all sessions with pending signups
  const { data: sessions, isLoading } = useQuery({
    queryKey: ['sessions-with-pending-signups'],
    queryFn: () => sessionApi.list(token!),
    enabled: !!token,
  });

  // Extract pending signups from all sessions
  const pendingSignups: PendingSignup[] = [];
  let sessionsList = sessions;
  
  // Handle different API response formats
  if (sessions && !Array.isArray(sessions)) {
    if (sessions.data && Array.isArray(sessions.data)) {
      sessionsList = sessions.data;
    }
  }
  
  if (sessionsList && Array.isArray(sessionsList)) {
    sessionsList.forEach((session: any) => {
      if (session.signups && Array.isArray(session.signups)) {
        session.signups
          .filter((signup: any) => signup.status === 'pending')
          .forEach((signup: any) => {
            pendingSignups.push({
              ...signup,
              session: {
                id: session.id,
                title: session.title,
                start_time: session.start_time,
                end_time: session.end_time,
                capacity: session.capacity,
              }
            });
          });
      }
    });
  }

  // Approve signup mutation
  const approveMutation = useMutation({
    mutationFn: ({ sessionId, signupId }: { sessionId: string; signupId: string }) =>
      sessionApi.approveSignup(token!, sessionId, signupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions-with-pending-signups'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      setShowDetailModal(false);
    },
  });

  // Reject signup mutation
  const rejectMutation = useMutation({
    mutationFn: ({ sessionId, signupId, reason }: { sessionId: string; signupId: string; reason?: string }) =>
      sessionApi.rejectSignup(token!, sessionId, signupId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions-with-pending-signups'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      setShowDetailModal(false);
    },
  });

  const handleApprove = (sessionId: string, signupId: string) => {
    approveMutation.mutate({ sessionId, signupId });
  };

  const handleReject = (sessionId: string, signupId: string) => {
    rejectMutation.mutate({ sessionId, signupId, reason: 'Zamietnuté trénerom' });
  };

  const handleViewDetails = (signup: PendingSignup) => {
    setSelectedSignup(signup);
    setShowDetailModal(true);
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
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <ClockIcon className="h-5 w-5 text-amber-600 mr-2" />
              Čakajúce schválenia
            </h3>
            {pendingSignups.length > 0 && (
              <span className="bg-amber-100 text-amber-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
                {pendingSignups.length} nových
              </span>
            )}
          </div>
        </div>
        
        <div className="p-6">
          {pendingSignups.length === 0 ? (
            <div className="text-center py-8">
              <CheckIcon className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Žiadne čakajúce schválenia</h3>
              <p className="mt-1 text-sm text-gray-500">Všetky prihlášky sú spracované.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingSignups.slice(0, 5).map((signup) => (
                <div 
                  key={signup.id} 
                  className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-200 hover:bg-amber-100 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="font-medium text-gray-900">
                        {signup.dog?.name || 'Neznámy pes'}
                      </div>
                      <span className="text-sm text-gray-500">•</span>
                      <div className="text-sm text-gray-600">
                        {signup.dog?.breed || 'Neznámy plemeno'}
                      </div>
                    </div>
                    <div className="flex items-center text-sm text-gray-600 space-x-4">
                      <div className="flex items-center space-x-1">
                        <UserIcon className="h-4 w-4" />
                        <span>{signup.dog?.owner?.name || 'Neznámy majiteľ'}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <ClockIcon className="h-4 w-4" />
                        <span>{signup.session?.title}</span>
                      </div>
                      <div>
                        {format(new Date(signup.session?.start_time), 'dd.MM. HH:mm', { locale: sk })}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleViewDetails(signup)}
                      className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                      title="Zobraziť detaily"
                    >
                      <EyeIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleApprove(signup.session_id, signup.id)}
                      disabled={approveMutation.isPending}
                      className="px-3 py-1.5 text-sm font-medium bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      {approveMutation.isPending ? 'Schvaľuje...' : 'Schváliť'}
                    </button>
                    <button
                      onClick={() => handleReject(signup.session_id, signup.id)}
                      disabled={rejectMutation.isPending}
                      className="px-3 py-1.5 text-sm font-medium bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                      {rejectMutation.isPending ? 'Zamieta...' : 'Zamietnuť'}
                    </button>
                  </div>
                </div>
              ))}
              
              {pendingSignups.length > 5 && (
                <div className="text-center pt-4">
                  <p className="text-sm text-gray-500">
                    a ďalších {pendingSignups.length - 5} prihlášok...
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedSignup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Detail prihlášky</h3>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Dog Info */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Informácie o psovi</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Meno:</span>
                      <span className="font-medium">{selectedSignup.dog?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Plemeno:</span>
                      <span className="font-medium">{selectedSignup.dog?.breed}</span>
                    </div>
                  </div>
                </div>

                {/* Owner Info */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Majiteľ</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Meno:</span>
                      <span className="font-medium">{selectedSignup.dog?.owner?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Email:</span>
                      <span className="font-medium">{selectedSignup.dog?.owner?.email}</span>
                    </div>
                  </div>
                </div>

                {/* Session Info */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Relácia</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Názov:</span>
                      <span className="font-medium">{selectedSignup.session?.title}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Dátum:</span>
                      <span className="font-medium">
                        {format(new Date(selectedSignup.session?.start_time), 'dd.MM.yyyy', { locale: sk })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Čas:</span>
                      <span className="font-medium">
                        {format(new Date(selectedSignup.session?.start_time), 'HH:mm', { locale: sk })} - {format(new Date(selectedSignup.session?.end_time), 'HH:mm', { locale: sk })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Signup Info */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Prihláška</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Prihlásené:</span>
                      <span className="font-medium">
                        {format(new Date(selectedSignup.signed_up_at), 'dd.MM.yyyy HH:mm', { locale: sk })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-full">
                        Čaká na schválenie
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => handleApprove(selectedSignup.session_id, selectedSignup.id)}
                  disabled={approveMutation.isPending}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors font-medium"
                >
                  {approveMutation.isPending ? 'Schvaľuje...' : 'Schváliť'}
                </button>
                <button
                  onClick={() => handleReject(selectedSignup.session_id, selectedSignup.id)}
                  disabled={rejectMutation.isPending}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors font-medium"
                >
                  {rejectMutation.isPending ? 'Zamieta...' : 'Zamietnuť'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 