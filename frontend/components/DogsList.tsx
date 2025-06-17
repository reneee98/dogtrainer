import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { dogApi } from '../lib/api';
import { toast } from 'react-toastify';
import DogForm from './DogForm';

interface Dog {
  id: number;
  name: string;
  breed: string;
  age: number;
  weight: number;
  medical_notes?: string;
  behavioral_notes?: string;
  vaccinations?: any;
  created_at: string;
}

export default function DogsList() {
  const { token } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingDog, setEditingDog] = useState<Dog | null>(null);
  const queryClient = useQueryClient();

  const { data: dogs, isLoading, error } = useQuery({
    queryKey: ['dogs'],
    queryFn: () => dogApi.list(token!),
    enabled: !!token,
  });

  const handleDelete = async (dogId: number) => {
    if (!confirm('Ste si istí, že chcete odstrániť tohto psa?')) return;

    try {
      await dogApi.delete(token!, dogId);
      queryClient.invalidateQueries({ queryKey: ['dogs'] });
      toast.success('Pes bol odstránený');
    } catch (error) {
      toast.error('Chyba pri odstraňovaní psa');
    }
  };

  const handleEdit = (dog: Dog) => {
    setEditingDog(dog);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingDog(null);
  };

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
        Chyba pri načítavaní psov
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Moje psy</h2>
        <button
          onClick={() => setShowForm(true)}
          className="btn btn-primary flex items-center"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Pridať psa
        </button>
      </div>

      {dogs?.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">Zatiaľ nemáte žiadnych psov</div>
          <button
            onClick={() => setShowForm(true)}
            className="btn btn-primary"
          >
            Pridať prvého psa
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dogs?.map((dog: Dog) => (
            <div key={dog.id} className="card">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-semibold text-gray-900">{dog.name}</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(dog)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(dog.id)}
                    className="text-gray-400 hover:text-red-600"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                <div>
                  <span className="font-medium">Plemeno:</span> {dog.breed}
                </div>
                <div>
                  <span className="font-medium">Vek:</span> {dog.age} rokov
                </div>
                <div>
                  <span className="font-medium">Váha:</span> {dog.weight} kg
                </div>
                {dog.medical_notes && (
                  <div>
                    <span className="font-medium">Zdravotné poznámky:</span>
                    <p className="mt-1 text-xs">{dog.medical_notes}</p>
                  </div>
                )}
                {dog.behavioral_notes && (
                  <div>
                    <span className="font-medium">Behaviorálne poznámky:</span>
                    <p className="mt-1 text-xs">{dog.behavioral_notes}</p>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="text-xs text-gray-500">
                  Pridané {new Date(dog.created_at).toLocaleDateString('sk-SK')}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <DogForm
          dog={editingDog}
          onClose={handleCloseForm}
          onSuccess={() => {
            handleCloseForm();
            queryClient.invalidateQueries({ queryKey: ['dogs'] });
          }}
        />
      )}
    </div>
  );
} 