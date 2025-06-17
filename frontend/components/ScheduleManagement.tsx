import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import DaycareScheduleForm from './DaycareScheduleForm';
import { 
  CalendarDaysIcon,
  ClockIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  PowerIcon,
  PlayIcon,
  UserGroupIcon,
  CurrencyEuroIcon
} from '@heroicons/react/24/outline';
import { format, parseISO } from 'date-fns';
import { sk } from 'date-fns/locale';

interface DaycareSchedule {
  id: number;
  name: string;
  description: string;
  start_time: string;
  end_time: string;
  capacity: number;
  price_per_day: number;
  days_of_week: number[];
  valid_from: string;
  valid_until: string;
  waitlist_enabled: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const DAYS_OF_WEEK = ['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne'];

export default function ScheduleManagement() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<DaycareSchedule | undefined>();
  const [showGenerateModal, setShowGenerateModal] = useState<DaycareSchedule | null>(null);
  const [generateData, setGenerateData] = useState({
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
  });

  // Fetch schedules
  const { data: schedules, isLoading, error } = useQuery({
    queryKey: ['daycare-schedules'],
    queryFn: async () => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/daycare-schedules`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Chyba pri načítavaní rozvrhov');
      }

      const result = await response.json();
      return Array.isArray(result) ? result : (result.data || []);
    },
    enabled: !!token,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/daycare-schedules/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Chyba pri mazaní rozvrhu');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daycare-schedules'] });
    },
  });

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/daycare-schedules/${id}/toggle-active`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Chyba pri zmene stavu rozvrhu');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daycare-schedules'] });
    },
  });

  // Generate sessions mutation
  const generateSessionsMutation = useMutation({
    mutationFn: async ({ scheduleId, data }: { scheduleId: number; data: any }) => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/daycare-schedules/${scheduleId}/generate-sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Chyba pri generovaní relácií');
      }

      return response.json();
    },
    onSuccess: () => {
      setShowGenerateModal(null);
      setGenerateData({
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
      });
    },
  });

  const handleEdit = (schedule: DaycareSchedule) => {
    setEditingSchedule(schedule);
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('Naozaj chcete zmazať tento rozvrh?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleToggleActive = (id: number) => {
    toggleActiveMutation.mutate(id);
  };

  const handleGenerateSessions = () => {
    if (!showGenerateModal || !generateData.start_date || !generateData.end_date) {
      return;
    }

    generateSessionsMutation.mutate({
      scheduleId: showGenerateModal.id,
      data: generateData
    });
  };

  const formatDays = (days: number[]) => {
    return days.sort().map(day => DAYS_OF_WEEK[day - 1]).join(', ');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">Chyba pri načítavaní rozvrhov</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Môj rozvrh</h2>
          <p className="text-gray-600">Spravujte svoje rozvrhy a generujte relácie</p>
        </div>
        <button
          onClick={() => {
            setEditingSchedule(undefined);
            setShowForm(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Nový rozvrh
        </button>
      </div>

      {/* Schedules Grid */}
      {schedules && schedules.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {schedules.map((schedule: DaycareSchedule) => (
            <div
              key={schedule.id}
              className={`bg-white rounded-xl border-2 transition-all hover:shadow-lg ${
                schedule.is_active 
                  ? 'border-green-200 shadow-sm' 
                  : 'border-gray-200 opacity-75'
              }`}
            >
              {/* Status Badge */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">
                      {schedule.name}
                    </h3>
                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-2 ${
                      schedule.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      <div className={`w-2 h-2 rounded-full mr-1 ${
                        schedule.is_active ? 'bg-green-400' : 'bg-gray-400'
                      }`} />
                      {schedule.is_active ? 'Aktívny' : 'Neaktívny'}
                    </div>
                  </div>
                  
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleToggleActive(schedule.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        schedule.is_active
                          ? 'text-orange-600 hover:bg-orange-50'
                          : 'text-green-600 hover:bg-green-50'
                      }`}
                      title={schedule.is_active ? 'Deaktivovať' : 'Aktivovať'}
                    >
                      <PowerIcon className="h-4 w-4" />
                    </button>
                    
                    <button
                      onClick={() => handleEdit(schedule)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Upraviť"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    
                    <button
                      onClick={() => handleDelete(schedule.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Zmazať"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Schedule Details */}
              <div className="p-4 space-y-3">
                <p className="text-gray-600 text-sm">{schedule.description}</p>

                <div className="flex items-center text-sm text-gray-500">
                  <ClockIcon className="h-4 w-4 mr-2" />
                  {schedule.start_time} - {schedule.end_time}
                </div>

                <div className="flex items-center text-sm text-gray-500">
                  <UserGroupIcon className="h-4 w-4 mr-2" />
                  Kapacita: {schedule.capacity} psov
                </div>

                <div className="flex items-center text-sm text-gray-500">
                  <CurrencyEuroIcon className="h-4 w-4 mr-2" />
                  {schedule.price_per_day}€ za deň
                </div>

                <div className="flex items-center text-sm text-gray-500">
                  <CalendarDaysIcon className="h-4 w-4 mr-2" />
                  {formatDays(schedule.days_of_week)}
                </div>

                {/* Valid Period */}
                <div className="text-xs text-gray-400 pt-2 border-t border-gray-100">
                  Platné od: {format(parseISO(schedule.valid_from), 'dd.MM.yyyy', { locale: sk })}
                  {schedule.valid_until && (
                    <> do: {format(parseISO(schedule.valid_until), 'dd.MM.yyyy', { locale: sk })}</>
                  )}
                </div>

                {/* Generate Sessions Button */}
                <button
                  onClick={() => setShowGenerateModal(schedule)}
                  className="w-full mt-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2 rounded-lg flex items-center justify-center transition-colors"
                  disabled={!schedule.is_active}
                >
                  <PlayIcon className="h-4 w-4 mr-2" />
                  Generovať relácie
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <CalendarDaysIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Žiadne rozvrhy</h3>
          <p className="mt-1 text-sm text-gray-500">
            Začnite vytvorením nového rozvrhu pre vaše denné pobyty.
          </p>
          <div className="mt-6">
            <button
              onClick={() => {
                setEditingSchedule(undefined);
                setShowForm(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center mx-auto transition-colors"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Vytvoriť rozvrh
            </button>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <DaycareScheduleForm
          schedule={editingSchedule}
          onClose={() => {
            setShowForm(false);
            setEditingSchedule(undefined);
          }}
          onSuccess={() => {
            setShowForm(false);
            setEditingSchedule(undefined);
          }}
        />
      )}

      {/* Generate Sessions Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Generovať relácie
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Pre rozvrh: {showGenerateModal.name}
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dátum od
                </label>
                <input
                  type="date"
                  value={generateData.start_date}
                  onChange={(e) => setGenerateData({ ...generateData, start_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dátum do
                </label>
                <input
                  type="date"
                  value={generateData.end_date}
                  onChange={(e) => setGenerateData({ ...generateData, end_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-700 text-sm">
                  Budú vytvorené relácie pre všetky dni v týždni definované v rozvrhu 
                  ({formatDays(showGenerateModal.days_of_week)}) medzi vybranými dátumami.
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowGenerateModal(null)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Zrušiť
              </button>
              <button
                onClick={handleGenerateSessions}
                disabled={generateSessionsMutation.isPending || !generateData.start_date || !generateData.end_date}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {generateSessionsMutation.isPending ? 'Generujem...' : 'Generovať'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 