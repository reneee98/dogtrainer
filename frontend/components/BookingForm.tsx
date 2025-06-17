import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { dogApi, bookingApi } from '../lib/api';
import { toast } from 'react-toastify';
import { XMarkIcon } from '@heroicons/react/24/outline';

const bookingSchema = z.object({
  dog_id: z.number().min(1, 'Vyberte psa'),
  service_type: z.enum(['training', 'consultation', 'behavior_training'], { required_error: 'Vyberte typ služby' }),
  start_time: z.string().min(1, 'Vyberte dátum a čas'),
  end_time: z.string().min(1, 'Vyberte čas ukončenia'),
  notes: z.string().optional(),
});

type BookingFormData = z.infer<typeof bookingSchema>;

interface BookingFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function BookingForm({ onClose, onSuccess }: BookingFormProps) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);

  const { data: dogs } = useQuery({
    queryKey: ['dogs'],
    queryFn: () => dogApi.list(token!),
    enabled: !!token,
  });

  const { register, handleSubmit, watch, formState: { errors } } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
  });

  const selectedDate = watch('start_time');
  const { data: availableSlots } = useQuery({
    queryKey: ['available-slots', selectedDate?.split('T')[0]],
    queryFn: () => bookingApi.availableSlots(token!, selectedDate?.split('T')[0] || ''),
    enabled: !!token && !!selectedDate,
  });

  const onSubmit = async (data: BookingFormData) => {
    setLoading(true);
    try {
      await bookingApi.create(token!, data);
      toast.success('Rezervácia bola úspešne vytvorená');
      onSuccess();
    } catch (error) {
      toast.error('Chyba pri vytváraní rezervácie');
    } finally {
      setLoading(false);
    }
  };

  const serviceTypes = [
    { value: 'training', label: 'Individuálny tréning' },
    { value: 'consultation', label: 'Konzultácia' },
    { value: 'behavior_training', label: 'Behaviorálny tréning' },
  ];

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-lg font-medium text-gray-900">
            Nová rezervácia
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
            <label className="form-label">Pes</label>
            <select {...register('dog_id', { valueAsNumber: true })} className="form-input">
              <option value="">Vyberte psa</option>
              {dogs?.map((dog: any) => (
                <option key={dog.id} value={dog.id}>
                  {dog.name} ({dog.breed})
                </option>
              ))}
            </select>
            {errors.dog_id && (
              <p className="mt-1 text-sm text-red-600">{errors.dog_id.message}</p>
            )}
          </div>

          <div>
            <label className="form-label">Typ služby</label>
            <select {...register('service_type')} className="form-input">
              <option value="">Vyberte typ služby</option>
              {serviceTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            {errors.service_type && (
              <p className="mt-1 text-sm text-red-600">{errors.service_type.message}</p>
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
                min={selectedDate || new Date().toISOString().slice(0, 16)}
              />
              {errors.end_time && (
                <p className="mt-1 text-sm text-red-600">{errors.end_time.message}</p>
              )}
            </div>
          </div>

          {selectedDate && availableSlots && (
            <div>
              <label className="form-label">Dostupné termíny</label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {availableSlots.map((slot: string) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => {
                      const date = selectedDate.split('T')[0];
                      const startTime = `${date}T${slot}`;
                      const endDate = new Date(startTime);
                      endDate.setHours(endDate.getHours() + 1);
                      
                      // Set form values
                      document.querySelector<HTMLInputElement>('input[name="start_time"]')!.value = startTime;
                      document.querySelector<HTMLInputElement>('input[name="end_time"]')!.value = endDate.toISOString().slice(0, 16);
                    }}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="form-label">Poznámky</label>
            <textarea
              {...register('notes')}
              rows={3}
              className="form-input"
              placeholder="Špecifické požiadavky alebo poznámky..."
            />
            {errors.notes && (
              <p className="mt-1 text-sm text-red-600">{errors.notes.message}</p>
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
              disabled={loading || !dogs?.length}
              className="btn btn-primary disabled:opacity-50"
            >
              {loading ? 'Vytváram...' : 'Vytvoriť rezerváciu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 