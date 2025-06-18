import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ClockIcon, 
  CheckIcon, 
  XMarkIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { sessionApi } from '../lib/api';
import { format } from 'date-fns';
import { sk } from 'date-fns/locale';

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
  
  if (sessionsList && Array.isArray(sessionsList)) {
    sessionsList.forEach((session: any) => {
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

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center space-x-2 mb-3">
          <ClockIcon className="h-5 w-5 text-amber-600" />
          <h3 className="font-medium text-gray-900">Čakajúce schválenia</h3>
        </div>
        <div className="animate-pulse space-y-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (pendingSignups.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center space-x-2 mb-3">
          <CheckIcon className="h-5 w-5 text-green-600" />
          <h3 className="font-medium text-gray-900">Čakajúce schválenia</h3>
        </div>
        <p className="text-sm text-gray-500">Všetko spracované ✓</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <ClockIcon className="h-5 w-5 text-amber-600" />
          <h3 className="font-medium text-gray-900">Čakajúce schválenia</h3>
        </div>
        <span className="bg-amber-100 text-amber-800 text-xs font-medium px-2 py-1 rounded-full">
          {pendingSignups.length}
        </span>
      </div>
      
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {pendingSignups.map((signup) => (
          <div
            key={signup.id}
            className="flex items-center justify-between p-3 bg-amber-50 rounded border border-amber-200 hover:bg-amber-100 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 text-sm">
                <UserIcon className="h-4 w-4 text-amber-600 flex-shrink-0" />
                <span className="font-medium text-gray-900 truncate">
                  {signup.dog?.name}
                </span>
                <span className="text-gray-500">•</span>
                <span className="text-gray-600 truncate">
                  {signup.dog?.owner?.name}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-1 truncate">
                {signup.session?.title} • {format(new Date(signup.session?.start_time), 'dd.MM HH:mm', { locale: sk })}
              </div>
            </div>
            
            <div className="flex space-x-1 ml-2 flex-shrink-0">
              <button
                onClick={() => handleApprove(signup.session_id, signup.id)}
                disabled={approveMutation.isPending}
                className="p-1.5 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
                title="Schváliť"
              >
                <CheckIcon className="h-3 w-3" />
              </button>
              <button
                onClick={() => handleReject(signup.session_id, signup.id)}
                disabled={rejectMutation.isPending}
                className="p-1.5 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
                title="Zamietnuť"
              >
                <XMarkIcon className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 