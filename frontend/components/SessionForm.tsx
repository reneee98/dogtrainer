import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { apiRequest, serviceTemplateApi } from '../lib/api';
import { ServiceTemplate } from './ServicesManagement';

const sessionSchema = z.object({
  title: z.string().min(3, 'Názov musí mať aspoň 3 znaky'),
  description: z.string().optional(),
  location: z.string().min(2, 'Zadajte miesto konania'),
  session_type: z.enum(['individual', 'group', 'daycare'], { required_error: 'Vyberte typ relácie' }),
  start_time: z.string().min(1, 'Vyberte dátum a čas začiatku'),
  duration: z.number().min(1, 'Vyberte trvanie').max(3, 'Maximálne trvanie je 3 hodiny'),
  capacity: z.number().min(1, 'Kapacita musí byť aspoň 1').max(20, 'Kapacita je príliš vysoká'),
  price: z.number().min(0, 'Cena musí byť kladné číslo'),
  waitlist_enabled: z.boolean().optional(),
});

type SessionFormData = z.infer<typeof sessionSchema>;

interface Session {
  id: string;
  title: string;
  description?: string;
  location: string;
  session_type: 'individual' | 'group' | 'daycare';
  start_time: string;
  end_time: string;
  capacity: number;
  price: number;
  waitlist_enabled: boolean;
}

interface SessionFormProps {
  session?: Session | null;
  date?: Date | null;
  onClose: () => void;
  onSuccess: () => void;
}

const calculateDuration = (startTime: string, endTime: string): number => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const diffInMs = end.getTime() - start.getTime();
  const diffInHours = diffInMs / (1000 * 60 * 60);
  return Math.round(diffInHours);
};

export default function SessionForm({ session, date, onClose, onSuccess }: SessionFormProps) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [serviceTemplates, setServiceTemplates] = useState<ServiceTemplate[]>([]);

  // Helper function to format date for datetime-local input
  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Default start time - if date is provided, use it at 9:00 AM, otherwise use current session time or empty
  const getDefaultStartTime = (): string => {
    if (session?.start_time) {
      return new Date(session.start_time).toISOString().slice(0, 16);
    }
    if (date) {
      const defaultDate = new Date(date);
      defaultDate.setHours(9, 0, 0, 0); // Set to 9:00 AM
      return formatDateForInput(defaultDate);
    }
    return '';
  };

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<SessionFormData>({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      title: session?.title || '',
      description: session?.description || '',
      location: session?.location || '',
      session_type: session?.session_type || 'individual',
      start_time: getDefaultStartTime(),
      duration: session?.start_time && session?.end_time 
        ? calculateDuration(session.start_time, session.end_time)
        : 1,
      capacity: session?.capacity || 1,
      price: session?.price || 0,
      waitlist_enabled: session?.waitlist_enabled || false,
    },
  });

  const startTime = watch('start_time');
  const duration = watch('duration');

  const calculateEndTime = (start: string, durationHours: number): string => {
    if (!start) return '';
    const startDate = new Date(start);
    const endDate = new Date(startDate.getTime() + durationHours * 60 * 60 * 1000);
    return endDate.toISOString();
  };

  const onSubmit = async (data: SessionFormData) => {
    setLoading(true);
    try {
      const endTime = calculateEndTime(data.start_time, data.duration);
      
      const sessionData = {
        title: data.title,
        description: data.description,
        location: data.location,
        session_type: data.session_type,
        start_time: new Date(data.start_time).toISOString(),
        end_time: endTime,
        capacity: data.capacity,
        price: data.price,
        waitlist_enabled: data.waitlist_enabled,
      };

      if (session) {
        await apiRequest(`/sessions/${session.id}`, {
          method: 'PUT',
          body: sessionData,
          token: token!,
        });
        alert('Relácia bola aktualizovaná');
      } else {
        await apiRequest('/sessions', {
          method: 'POST',
          body: sessionData,
          token: token!,
        });
        alert('Relácia bola vytvorená');
      }
      onSuccess();
    } catch (error: any) {
      console.error('Error:', error);
      alert(`Chyba pri ukladaní relácie: ${error.message || 'Neznáma chyba'}`);
    } finally {
      setLoading(false);
    }
  };

  // Načítanie service templates pri načítaní komponenty
  useEffect(() => {
    const loadServiceTemplates = async () => {
      if (!token) return;
      
      try {
        const response = await serviceTemplateApi.list(token);
        if (response.success) {
          setServiceTemplates(response.data);
        }
      } catch (error) {
        console.error('Error loading service templates:', error);
      }
    };

    loadServiceTemplates();
  }, [token]);

  // Predvyplnenie podľa šablóny
  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const templateId = e.target.value ? parseInt(e.target.value) : null;
    const template = serviceTemplates.find(t => t.id === templateId);
    setSelectedTemplateId(templateId);
    if (template) {
      setValue('title', template.name);
      // Prednastavíme typ na skupinový ak sa jedná o template (väčšinou budú skupinové)
      setValue('session_type', 'group');
      setValue('duration', template.duration);
      setValue('price', template.price);
      setValue('description', template.description || '');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
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
          {/* Výber šablóny služby */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Šablóna služby</label>
            <select value={selectedTemplateId || ''} onChange={handleTemplateChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
              <option value="">Vyberte šablónu (voliteľné)</option>
              {serviceTemplates.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Názov relácie</label>
            <input
              {...register('title')}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Základy poslušnosti"
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Typ relácie</label>
            <select {...register('session_type')} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
              <option value="individual">Individuálny tréning</option>
              <option value="group">Skupinový tréning</option>
              <option value="daycare">Jasle</option>
            </select>
            {errors.session_type && (
              <p className="mt-1 text-sm text-red-600">{errors.session_type.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Miesto konania</label>
            <input
              {...register('location')}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Tréningové centrum, Bratislava"
            />
            {errors.location && (
              <p className="mt-1 text-sm text-red-600">{errors.location.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Začiatok</label>
              <input
                {...register('start_time')}
                type="datetime-local"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                min={new Date().toISOString().slice(0, 16)}
              />
              {errors.start_time && (
                <p className="mt-1 text-sm text-red-600">{errors.start_time.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trvanie</label>
              <select 
                {...register('duration', { valueAsNumber: true })} 
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value={1}>1 hodina</option>
                <option value={2}>2 hodiny</option>
                <option value={3}>3 hodiny</option>
              </select>
              {errors.duration && (
                <p className="mt-1 text-sm text-red-600">{errors.duration.message}</p>
              )}
              {startTime && duration && (
                <p className="mt-1 text-xs text-gray-500">
                  Koniec: {new Date(calculateEndTime(startTime, duration)).toLocaleString('sk-SK')}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kapacita (počet psov)</label>
              <input
                {...register('capacity', { valueAsNumber: true})}
                type="number"
                min="1"
                max="20"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="1"
              />
              {errors.capacity && (
                <p className="mt-1 text-sm text-red-600">{errors.capacity.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cena (€)</label>
              <input
                {...register('price', { valueAsNumber: true})}
                type="number"
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="25.00"
              />
              {errors.price && (
                <p className="mt-1 text-sm text-red-600">{errors.price.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                {...register('waitlist_enabled')}
                type="checkbox"
                className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              />
              <span className="text-sm font-medium text-gray-700">Povoliť čakaciu listinu</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Popis relácie</label>
            <textarea
              {...register('description')}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Zrušiť
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 border border-transparent rounded-md text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {loading ? 'Ukladanie...' : (session ? 'Aktualizovať' : 'Vytvoriť reláciu')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 