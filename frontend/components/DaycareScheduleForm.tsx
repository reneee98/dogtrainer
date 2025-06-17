import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { daycareApi } from '../lib/api';
import { toast } from 'react-toastify';

const scheduleSchema = z.object({
  name: z.string().min(3, 'Názov musí mať aspoň 3 znaky'),
  start_time: z.string().min(1, 'Vyberte začiatok'),
  end_time: z.string().min(1, 'Vyberte koniec'),
  days_of_week: z.array(z.number()).min(1, 'Vyberte aspoň jeden deň'),
  capacity: z.number().min(1, 'Kapacita musí byť aspoň 1').max(50, 'Kapacita je príliš vysoká'),
  price: z.number().min(0, 'Cena musí byť kladné číslo'),
});

type ScheduleFormData = z.infer<typeof scheduleSchema>;

interface DaycareSchedule {
  id: number;
  name: string;
  start_time: string;
  end_time: string;
  days_of_week: number[];
  capacity: number;
  price: number;
}

interface DaycareScheduleFormProps {
  schedule?: DaycareSchedule | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DaycareScheduleForm({ schedule, onClose, onSuccess }: DaycareScheduleFormProps) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>(schedule?.days_of_week || []);

  const { register, handleSubmit, formState: { errors } } = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      name: schedule?.name || '',
      start_time: schedule?.start_time || '',
      end_time: schedule?.end_time || '',
      days_of_week: schedule?.days_of_week || [],
      capacity: schedule?.capacity || 10,
      price: schedule?.price || 0,
    },
  });

  const daysOfWeek = [
    { value: 1, label: 'Pondelok' },
    { value: 2, label: 'Utorok' },
    { value: 3, label: 'Streda' },
    { value: 4, label: 'Štvrtok' },
    { value: 5, label: 'Piatok' },
    { value: 6, label: 'Sobota' },
    { value: 0, label: 'Nedeľa' },
  ];

  const toggleDay = (dayValue: number) => {
    setSelectedDays(prev => 
      prev.includes(dayValue)
        ? prev.filter(d => d !== dayValue)
        : [...prev, dayValue]
    );
  };

  const onSubmit = async (data: ScheduleFormData) => {
    if (selectedDays.length === 0) {
      toast.error('Vyberte aspoň jeden deň');
      return;
    }

    setLoading(true);
    try {
      const formData = { ...data, days_of_week: selectedDays };
      
      if (schedule) {
        await daycareApi.update(token!, schedule.id, formData);
        toast.success('Rozvrh bol aktualizovaný');
      } else {
        await daycareApi.create(token!, formData);
        toast.success('Rozvrh bol vytvorený');
      }
      onSuccess();
    } catch (error) {
      toast.error('Chyba pri ukladaní rozvrhu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-lg font-medium text-gray-900">
            {schedule ? 'Upraviť rozvrh' : 'Nový rozvrh jaslí'}
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
            <label className="form-label">Názov rozvrhu</label>
            <input
              {...register('name')}
              type="text"
              className="form-input"
              placeholder="Denné jasle"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Začiatok</label>
              <input
                {...register('start_time')}
                type="time"
                className="form-input"
              />
              {errors.start_time && (
                <p className="mt-1 text-sm text-red-600">{errors.start_time.message}</p>
              )}
            </div>

            <div>
              <label className="form-label">Koniec</label>
              <input
                {...register('end_time')}
                type="time"
                className="form-input"
              />
              {errors.end_time && (
                <p className="mt-1 text-sm text-red-600">{errors.end_time.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="form-label">Dni v týždni</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
              {daysOfWeek.map((day) => (
                <label
                  key={day.value}
                  className={`
                    flex items-center justify-center p-3 border rounded-lg cursor-pointer transition-colors
                    ${selectedDays.includes(day.value)
                      ? 'bg-primary-100 border-primary-300 text-primary-700'
                      : 'bg-white border-gray-300 hover:bg-gray-50'
                    }
                  `}
                >
                  <input
                    type="checkbox"
                    checked={selectedDays.includes(day.value)}
                    onChange={() => toggleDay(day.value)}
                    className="sr-only"
                  />
                  <span className="text-sm font-medium">{day.label}</span>
                </label>
              ))}
            </div>
            {selectedDays.length === 0 && (
              <p className="mt-1 text-sm text-red-600">Vyberte aspoň jeden deň</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Kapacita (počet psov)</label>
              <input
                {...register('capacity', { valueAsNumber: true })}
                type="number"
                min="1"
                max="50"
                className="form-input"
                placeholder="10"
              />
              {errors.capacity && (
                <p className="mt-1 text-sm text-red-600">{errors.capacity.message}</p>
              )}
            </div>

            <div>
              <label className="form-label">Cena za deň (€)</label>
              <input
                {...register('price', { valueAsNumber: true })}
                type="number"
                min="0"
                step="0.01"
                className="form-input"
                placeholder="15.00"
              />
              {errors.price && (
                <p className="mt-1 text-sm text-red-600">{errors.price.message}</p>
              )}
            </div>
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
              {loading ? 'Ukladanie...' : (schedule ? 'Aktualizovať' : 'Vytvoriť rozvrh')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 