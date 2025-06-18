import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { sessionApi, dogApi } from '../lib/api';
import { toast } from 'react-toastify';

interface WaitlistButtonProps {
  sessionId: string | number;
}

export default function WaitlistButton({ sessionId }: WaitlistButtonProps) {
  const { token, user } = useAuth();
  const [showDogSelect, setShowDogSelect] = useState(false);
  const [selectedDogId, setSelectedDogId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { data: dogsResponse } = useQuery({
    queryKey: ['dogs'],
    queryFn: () => dogApi.list(token!),
    enabled: !!token && user?.role === 'owner',
  });

  const dogs = dogsResponse?.data?.dogs || [];

  const handleJoinWaitlist = async () => {
    if (!selectedDogId) {
      toast.error('Vyberte psa');
      return;
    }

    setLoading(true);
    try {
      await sessionApi.joinWaitlist(token!, sessionId, selectedDogId);
      toast.success('Pes bol pridaný na čakaciu listinu');
      setShowDogSelect(false);
      setSelectedDogId(null);
    } catch (error) {
      toast.error('Chyba pri pridávaní na čakaciu listinu');
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== 'owner') {
    return null;
  }

  return (
    <div>
      {!showDogSelect ? (
        <button
          onClick={() => setShowDogSelect(true)}
          className="border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-50"
        >
          Pridať na čakaciu listinu
        </button>
      ) : (
        <div className="bg-yellow-50 rounded-lg p-4 mt-3">
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
              onClick={handleJoinWaitlist}
              disabled={loading || !selectedDogId}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Pridávam...' : 'Pridať na waitlist'}
            </button>
            <button
              onClick={() => {
                setShowDogSelect(false);
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
  );
} 