import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { FaUser, FaSpinner, FaCheck, FaTimes, FaUserPlus, FaClock, FaEye } from 'react-icons/fa';
import { toast } from 'react-toastify';

interface TrainerClientRelationship {
  id: string;
  status: 'pending' | 'approved' | 'rejected' | 'blocked';
  request_message: string | null;
  trainer_notes: string | null;
  requested_at: string;
  responded_at: string | null;
  client: {
    id: string;
    name: string;
    email: string;
    avatar_url: string | null;
    created_at: string;
  };
}

const ClientRequestsManagement = () => {
  const { user } = useAuth();
  const [relationships, setRelationships] = useState<TrainerClientRelationship[]>([]);
  const [pendingRequests, setPendingRequests] = useState<TrainerClientRelationship[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<TrainerClientRelationship | null>(null);
  const [responseNotes, setResponseNotes] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'block' | null>(null);

  useEffect(() => {
    if (user?.role === 'trainer') {
      fetchRelationships();
      fetchPendingRequests();
    }
  }, [user]);

  const fetchRelationships = async () => {
    try {
      const response = await api.get('/trainer-clients');
      setRelationships(response.data.data.data || []);
    } catch (error: any) {
      console.error('Error fetching relationships:', error);
      toast.error('Nepodarilo sa načítať zoznam klientov');
    }
  };

  const fetchPendingRequests = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/trainer-clients/pending-requests');
      setPendingRequests(response.data.data.data || []);
    } catch (error: any) {
      console.error('Error fetching pending requests:', error);
      toast.error('Nepodarilo sa načítať žiadosti klientov');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = (request: TrainerClientRelationship, action: 'approve' | 'reject' | 'block') => {
    setSelectedRequest(request);
    setActionType(action);
    setResponseNotes('');
    setShowModal(true);
  };

  const confirmAction = async () => {
    if (!selectedRequest || !actionType) return;

    try {
      await api.put(`/trainer-clients/${selectedRequest.id}/status`, {
        status: actionType === 'approve' ? 'approved' : actionType,
        trainer_notes: responseNotes
      });

      toast.success(
        actionType === 'approve' ? 'Klient bol schválený' :
        actionType === 'reject' ? 'Žiadosť bola zamietnutá' :
        'Klient bol zablokovaný'
      );

      // Refresh data
      fetchRelationships();
      fetchPendingRequests();
      
      // Close modal
      setShowModal(false);
      setSelectedRequest(null);
      setActionType(null);
      setResponseNotes('');
    } catch (error: any) {
      console.error('Error updating relationship status:', error);
      toast.error('Nepodarilo sa aktualizovať stav žiadosti');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('sk-SK', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      blocked: 'bg-gray-100 text-gray-800'
    };

    const statusTexts = {
      pending: 'Čaká na schválenie',
      approved: 'Schválený',
      rejected: 'Zamietnutý',
      blocked: 'Zablokovaný'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusStyles[status as keyof typeof statusStyles]}`}>
        {statusTexts[status as keyof typeof statusTexts]}
      </span>
    );
  };

  if (user?.role !== 'trainer') {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Táto stránka je dostupná iba pre trénerov.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Pending Requests Section */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <FaClock className="text-yellow-500 text-xl" />
            <h2 className="text-xl font-semibold text-gray-900">Čakajúce žiadosti</h2>
            {pendingRequests.length > 0 && (
              <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-sm font-medium">
                {pendingRequests.length}
              </span>
            )}
          </div>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <FaSpinner className="animate-spin text-indigo-500 text-2xl mr-2" />
              <span className="text-gray-600">Načítavam žiadosti...</span>
            </div>
          ) : pendingRequests.length === 0 ? (
            <div className="text-center py-8">
              <FaUserPlus className="text-gray-400 text-4xl mx-auto mb-4" />
              <p className="text-gray-500">Žiadne nové žiadosti od klientov</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        {request.client.avatar_url ? (
                          <img
                            src={request.client.avatar_url}
                            alt={request.client.name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                            <FaUser className="text-gray-500 text-xl" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{request.client.name}</h3>
                        <p className="text-sm text-gray-600">{request.client.email}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          Žiadosť odoslaná: {formatDate(request.requested_at)}
                        </p>
                        
                        {request.request_message && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-700">{request.request_message}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAction(request, 'approve')}
                        className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
                      >
                        <FaCheck />
                        Schváliť
                      </button>
                      <button
                        onClick={() => handleAction(request, 'reject')}
                        className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
                      >
                        <FaTimes />
                        Zamietnuť
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* All Relationships Section */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <FaUser className="text-indigo-500 text-xl" />
            <h2 className="text-xl font-semibold text-gray-900">Všetci klienti</h2>
            {relationships.length > 0 && (
              <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full text-sm font-medium">
                {relationships.length}
              </span>
            )}
          </div>
        </div>

        <div className="p-6">
          {relationships.length === 0 ? (
            <div className="text-center py-8">
              <FaUser className="text-gray-400 text-4xl mx-auto mb-4" />
              <p className="text-gray-500">Zatiaľ nemáte žiadnych klientov</p>
            </div>
          ) : (
            <div className="space-y-4">
              {relationships.map((relationship) => (
                <div key={relationship.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        {relationship.client.avatar_url ? (
                          <img
                            src={relationship.client.avatar_url}
                            alt={relationship.client.name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                            <FaUser className="text-gray-500 text-xl" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{relationship.client.name}</h3>
                        <p className="text-sm text-gray-600">{relationship.client.email}</p>
                        <div className="mt-2">
                          {getStatusBadge(relationship.status)}
                        </div>
                        
                        {relationship.trainer_notes && (
                          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                            <p className="text-sm text-blue-700"><strong>Vaša poznámka:</strong> {relationship.trainer_notes}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {relationship.status === 'approved' && (
                      <button
                        onClick={() => handleAction(relationship, 'block')}
                        className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                      >
                        Zablokovať
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Action Modal */}
      {showModal && selectedRequest && actionType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {actionType === 'approve' ? 'Schváliť klienta' :
               actionType === 'reject' ? 'Zamietnuť žiadosť' :
               'Zablokovať klienta'}
            </h3>
            
            <p className="text-gray-600 mb-4">
              Klient: <strong>{selectedRequest.client.name}</strong>
            </p>

            <div className="mb-4">
              <label htmlFor="responseNotes" className="block text-sm font-medium text-gray-700 mb-2">
                Poznámka (voliteľné)
              </label>
              <textarea
                id="responseNotes"
                rows={3}
                value={responseNotes}
                onChange={(e) => setResponseNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Napíšte poznámku..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Zrušiť
              </button>
              <button
                onClick={confirmAction}
                className={`flex-1 text-white py-2 px-4 rounded-lg transition-colors ${
                  actionType === 'approve' ? 'bg-green-500 hover:bg-green-600' :
                  actionType === 'reject' ? 'bg-red-500 hover:bg-red-600' :
                  'bg-gray-500 hover:bg-gray-600'
                }`}
              >
                {actionType === 'approve' ? 'Schváliť' :
                 actionType === 'reject' ? 'Zamietnuť' :
                 'Zablokovať'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientRequestsManagement; 