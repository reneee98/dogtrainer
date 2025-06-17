import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { dogApi } from '../lib/api';
import { toast } from 'react-toastify';
import { useState } from 'react';

const dogSchema = z.object({
  name: z.string().min(2, 'Meno musí mať aspoň 2 znaky'),
  breed: z.string().min(2, 'Plemeno musí mať aspoň 2 znaky'),
  age: z.number().min(0, 'Vek musí byť kladné číslo').max(30, 'Vek je príliš vysoký'),
  weight: z.number().min(0.1, 'Váha musí byť kladné číslo').max(150, 'Váha je príliš vysoká'),
  medical_notes: z.string().optional(),
  behavioral_notes: z.string().optional(),
});

type DogFormData = z.infer<typeof dogSchema>;

interface Dog {
  id: number;
  name: string;
  breed: string;
  age: number;
  weight: number;
  medical_notes?: string;
  behavioral_notes?: string;
}

interface DogFormProps {
  dog?: Dog | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DogForm({ dog, onClose, onSuccess }: DogFormProps) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<DogFormData>({
    resolver: zodResolver(dogSchema),
    defaultValues: {
      name: dog?.name || '',
      breed: dog?.breed || '',
      age: dog?.age || 0,
      weight: dog?.weight || 0,
      medical_notes: dog?.medical_notes || '',
      behavioral_notes: dog?.behavioral_notes || '',
    },
  });

  const onSubmit = async (data: DogFormData) => {
    setLoading(true);
    try {
      if (dog) {
        await dogApi.update(token!, dog.id, data);
        toast.success('Pes bol aktualizovaný');
      } else {
        await dogApi.create(token!, data);
        toast.success('Pes bol pridaný');
      }
      onSuccess();
    } catch (error) {
      toast.error('Chyba pri ukladaní psa');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-lg font-medium text-gray-900">
            {dog ? 'Upraviť psa' : 'Pridať nového psa'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Meno psa</label>
              <input
                {...register('name')}
                type="text"
                className="form-input"
                placeholder="Rex"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="form-label">Plemeno</label>
              <input
                {...register('breed')}
                type="text"
                className="form-input"
                placeholder="Nemecký ovčiak"
              />
              {errors.breed && (
                <p className="mt-1 text-sm text-red-600">{errors.breed.message}</p>
              )}
            </div>

            <div>
              <label className="form-label">Vek (roky)</label>
              <input
                {...register('age', { valueAsNumber: true })}
                type="number"
                min="0"
                max="30"
                className="form-input"
                placeholder="3"
              />
              {errors.age && (
                <p className="mt-1 text-sm text-red-600">{errors.age.message}</p>
              )}
            </div>

            <div>
              <label className="form-label">Váha (kg)</label>
              <input
                {...register('weight', { valueAsNumber: true })}
                type="number"
                min="0.1"
                max="150"
                step="0.1"
                className="form-input"
                placeholder="25.5"
              />
              {errors.weight && (
                <p className="mt-1 text-sm text-red-600">{errors.weight.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="form-label">Zdravotné poznámky</label>
            <textarea
              {...register('medical_notes')}
              rows={3}
              className="form-input"
              placeholder="Alergie, lieky, zdravotné problémy..."
            />
            {errors.medical_notes && (
              <p className="mt-1 text-sm text-red-600">{errors.medical_notes.message}</p>
            )}
          </div>

          <div>
            <label className="form-label">Behaviorálne poznámky</label>
            <textarea
              {...register('behavioral_notes')}
              rows={3}
              className="form-input"
              placeholder="Správanie, zvyky, špecifické potreby..."
            />
            {errors.behavioral_notes && (
              <p className="mt-1 text-sm text-red-600">{errors.behavioral_notes.message}</p>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline"
            >
              Zrušiť
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary disabled:opacity-50"
            >
              {loading ? 'Ukladanie...' : (dog ? 'Aktualizovať' : 'Pridať psa')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 