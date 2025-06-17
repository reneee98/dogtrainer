import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { apiRequest } from '../lib/api';
import { format } from 'date-fns';
import { sk } from 'date-fns/locale';
import SessionForm from './SessionForm';

interface Session {
  id: string;
  title: string;
  description?: string;
  location: string;
  session_type: 'individual' | 'group' | 'daycare';
  start_time: string;
  end_time: string;
  capacity: number;
  status: 'scheduled' | 'cancelled' | 'completed';
  price: number;
  waitlist_enabled: boolean;
  available_spots?: number;
  signups?: { id: string }[];
}

export default function SessionsListTrainer() {
  const { token, user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null | undefined>(null);
  const queryClient = useQueryClient();

  const { data: sessions, isLoading, error } = useQuery({
    queryKey: ['trainer-sessions'],
    queryFn: async () => {
      const response = await apiRequest('/sessions', { token: token! });
      if (response.success && response.data) {
        return Array.isArray(response.data) ? response.data : response.data.data || [];
      }
      return Array.isArray(response) ? response : [];
    },
    enabled: !!token && user?.role === 'trainer',
  });

  const handleDelete = async (sessionId: string) => {
    if (!confirm('Ste si istí, že chcete odstrániť túto reláciu?')) return;

    try {
      await apiRequest(`/sessions/${sessionId}`, {
        method: 'DELETE',
        token: token!
      });
      queryClient.invalidateQueries({ queryKey: ['trainer-sessions'] });
      alert('Relácia bola odstránená');
    } catch (error: any) {
      alert(`Chyba pri odstraňovaní relácie: ${error.message}`);
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

  const handleFormSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['trainer-sessions'] });
    handleCloseForm();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
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
      case 'scheduled':
        return 'Naplánovaná';
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
      case 'individual':
        return 'Individuálny tréning';
      case 'group':
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
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
    <div className="space-y-4 px-4">
      <div className="flex justify-between items-center px-4 py-3">
        <h2 className="text-2xl font-bold text-gray-900">Moje tréningové relácie</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Nová relácia
        </button>
      </div>

      {!sessions || sessions.length === 0 ? (
        <div className="text-center py-6">
          <div className="text-gray-500 mb-2">Zatiaľ nemáte žiadne relácie</div>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Vytvoriť prvú reláciu
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sessions.map((session: Session) => (
            <div key={session.id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-1">{session.title}</h3>
                  <span className={`inline-block px-2 py-1 text-xs rounded-full ${getStatusColor(session.status)}`}>
                    {getStatusText(session.status)}
                  </span>
                </div>
                <div className="flex space-x-2">
                  {session.status === 'scheduled' && (
                    <>
                      <button
                        onClick={() => handleEdit(session)}
                        className="text-gray-400 hover:text-gray-600"
                        title="Upraviť"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(session.id)}
                        className="text-gray-400 hover:text-red-600"
                        title="Zmazať"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                <div>
                  <span className="font-medium">Typ:</span> {getTypeText(session.session_type)}
                </div>
                <div>
                  <span className="font-medium">Miesto:</span> {session.location}
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
                  <span className="font-medium">Kapacita:</span> {session.capacity}
                </div>
                <div>
                  <span className="font-medium">Cena:</span> {session.price}€
                </div>
                {session.description && (
                  <div>
                    <span className="font-medium">Popis:</span> {session.description.substring(0, 100)}{session.description.length > 100 ? '...' : ''}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <SessionForm
          session={editingSession}
          onClose={handleCloseForm}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
} 