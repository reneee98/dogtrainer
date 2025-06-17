import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { sessionApi } from '../lib/api';
import { toast } from 'react-toastify';

const sessionSchema = z.object({
  name: z.string().min(3, 'Názov musí mať aspoň 3 znaky'),
  description: z.string().optional(),
  type: z.enum(['group_training', 'daycare'], { required_error: 'Vyberte typ relácie' }),
  start_time: z.string().min(1, 'Vyberte dátum a čas začiatku'),
  end_time: z.string().min(1, 'Vyberte dátum a čas konca'),
  capacity: z.number().min(1, 'Kapacita musí byť aspoň 1').max(20, 'Kapacita je príliš vysoká'),
  price: z.number().min(0, 'Cena musí byť kladné číslo'),
});

type SessionFormData = z.infer<typeof sessionSchema>;

interface Session {
  id: number;
  name: string;
  description?: string;
  type: 'group_training' | 'daycare';
  start_time: string;
  end_time: string;
  capacity: number;
  price: number;
}

interface SessionFormProps {
  session?: Session | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SessionForm({ session, onClose, onSuccess }: SessionFormProps) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<SessionFormData>({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      name: session?.name || '',
      description: session?.description || '',
      type: session?.type || 'group_training',
      start_time: session?.start_time ? new Date(session.start_time).toISOString().slice(0, 16) : '',
      end_time: session?.end_time ? new Date(session.end_time).toISOString().slice(0, 16) : '',
      capacity: session?.capacity || 5,
      price: session?.price || 0,
    },
  });

  const onSubmit = async (data: SessionFormData) => {
    setLoading(true);
    try {
      if (session) {
        await sessionApi.update(token!, session.id, data);
        toast.success('Relácia bola aktualizovaná');
      } else {
        await sessionApi.create(token!, data);
        toast.success('Relácia bola vytvorená');
      }
      onSuccess();
    } catch (error) {
      toast.error('Chyba pri ukladaní relácie');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-lg font-medium text-gray-900">
            {session ? 'Upraviť reláciu' : 'Nová tréningová relácia'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="form-label">Názov relácie</label>
            <input
              {...register('name')}
              type="text"
              className="form-input"
              placeholder="Základy poslušnosti"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="form-label">Typ relácie</label>
            <select {...register('type')} className="form-input">
              <option value="group_training">Skupinový tréning</option>
              <option value="daycare">Jasle</option>
            </select>
            {errors.type && (
              <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Začiatok</label>
              <input
                {...register('start_time')}
                type="datetime-local"
                className="form-input"
                min={new Date().toISOString().slice(0, 16)}
              />
              {errors.start_time && (
                <p className="mt-1 text-sm text-red-600">{errors.start_time.message}</p>
              )}
            </div>

            <div>
              <label className="form-label">Koniec</label>
              <input
                {...register('end_time')}
                type="datetime-local"
                className="form-input"
              />
              {errors.end_time && (
                <p className="mt-1 text-sm text-red-600">{errors.end_time.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Kapacita (počet psov)</label>
              <input
                {...register('capacity', { valueAsNumber: true })}
                type="number"
                min="1"
                max="20"
                className="form-input"
                placeholder="5"
              />
              {errors.capacity && (
                <p className="mt-1 text-sm text-red-600">{errors.capacity.message}</p>
              )}
            </div>

            <div>
              <label className="form-label">Cena (€)</label>
              <input
                {...register('price', { valueAsNumber: true })}
                type="number"
                min="0"
                step="0.01"
                className="form-input"
                placeholder="25.00"
              />
              {errors.price && (
                <p className="mt-1 text-sm text-red-600">{errors.price.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="form-label">Popis relácie</label>
            <textarea
              {...register('description')}
              rows={4}
              className="form-input"
              placeholder="Detailný popis čo sa bude na relácii učiť, pre akých psov je vhodná, atď..."
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
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
              {loading ? 'Ukladanie...' : (session ? 'Aktualizovať' : 'Vytvoriť reláciu')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 