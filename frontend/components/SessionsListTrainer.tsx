import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, PencilIcon, TrashIcon, UsersIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { sessionApi } from '../lib/api';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { sk } from 'date-fns/locale';
import SessionForm from './SessionForm';
import SessionDetailModal from './SessionDetailModal';

interface Session {
  id: number;
  name: string;
  description: string;
  type: 'group_training' | 'daycare';
  start_time: string;
  end_time: string;
  capacity: number;
  current_signups: number;
  status: 'active' | 'cancelled' | 'completed';
  price: number;
  created_at: string;
}

export default function SessionsListTrainer() {
  const { token, user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const queryClient = useQueryClient();

  const { data: sessions, isLoading, error } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => sessionApi.list(token!),
    enabled: !!token && user?.role === 'trainer',
  });

  const handleDelete = async (sessionId: number) => {
    if (!confirm('Ste si istí, že chcete odstrániť túto reláciu?')) return;

    try {
      await sessionApi.delete(token!, sessionId);
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast.success('Relácia bola odstránená');
    } catch (error) {
      toast.error('Chyba pri odstraňovaní relácie');
    }
  };

  const handleEdit = (session: Session) => {
    setEditingSession(session);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingSession(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Aktívna';
      case 'cancelled':
        return 'Zrušená';
      case 'completed':
        return 'Dokončená';
      default:
        return status;
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'group_training':
        return 'Skupinový tréning';
      case 'daycare':
        return 'Jasle';
      default:
        return type;
    }
  };

  if (user?.role !== 'trainer') {
    return (
      <div className="text-center text-gray-500 p-8">
        Táto stránka je dostupná len pre trénerov
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 p-4">
        Chyba pri načítavaní relácií
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Moje tréningové relácie</h2>
        <button
          onClick={() => setShowForm(true)}
          className="btn btn-primary flex items-center"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Nová relácia
        </button>
      </div>

      {sessions?.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">Zatiaľ nemáte žiadne relácie</div>
          <button
            onClick={() => setShowForm(true)}
            className="btn btn-primary"
          >
            Vytvoriť prvú reláciu
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions?.map((session: Session) => (
            <div key={session.id} className="card">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{session.name}</h3>
                  <span className={`inline-block px-2 py-1 text-xs rounded-full ${getStatusColor(session.status)}`}>
                    {getStatusText(session.status)}
                  </span>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setSelectedSession(session)}
                    className="text-gray-400 hover:text-blue-600"
                    title="Zobraziť účastníkov"
                  >
                    <UsersIcon className="h-5 w-5" />
                  </button>
                  {session.status === 'active' && (
                    <>
                      <button
                        onClick={() => handleEdit(session)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(session.id)}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                <div>
                  <span className="font-medium">Typ:</span> {getTypeText(session.type)}
                </div>
                <div>
                  <span className="font-medium">Začiatok:</span> {' '}
                  {format(new Date(session.start_time), 'dd.MM.yyyy HH:mm', { locale: sk })}
                </div>
                <div>
                  <span className="font-medium">Koniec:</span> {' '}
                  {format(new Date(session.end_time), 'dd.MM.yyyy HH:mm', { locale: sk })}
                </div>
                <div>
                  <span className="font-medium">Kapacita:</span> {' '}
                  <span className={session.current_signups >= session.capacity ? 'text-red-600' : 'text-green-600'}>
                    {session.current_signups}/{session.capacity}
                  </span>
                </div>
                {session.description && (
                  <div>
                    <span className="font-medium">Popis:</span>
                    <p className="mt-1 text-xs">{session.description}</p>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setSelectedSession(session)}
                  className="w-full btn btn-outline text-sm"
                >
                  Zobraziť účastníkov
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <SessionForm
          session={editingSession}
          onClose={handleCloseForm}
          onSuccess={() => {
            handleCloseForm();
            queryClient.invalidateQueries({ queryKey: ['sessions'] });
          }}
        />
      )}

      {selectedSession && (
        <SessionDetailModal
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
        />
      )}
    </div>
  );
} 