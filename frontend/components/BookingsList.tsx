import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PencilIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { bookingApi } from '../lib/api';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { sk } from 'date-fns/locale';
import BookingForm from './BookingForm';

interface Booking {
  id: number;
  dog: {
    id: number;
    name: string;
    breed: string;
  };
  service_type: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  created_at: string;
}

export default function BookingsList() {
  const { token } = useAuth();
  const [showRescheduleForm, setShowRescheduleForm] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const queryClient = useQueryClient();

  const { data: bookings, isLoading, error } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => bookingApi.list(token!),
    enabled: !!token,
  });

  const handleCancel = async (bookingId: number) => {
    if (!confirm('Ste si istí, že chcete zrušiť túto rezerváciu?')) return;

    try {
      await bookingApi.cancel(token!, bookingId);
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast.success('Rezervácia bola zrušená');
    } catch (error) {
      toast.error('Chyba pri rušení rezervácie');
    }
  };

  const handleReschedule = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowRescheduleForm(true);
  };

  const handleCloseRescheduleForm = () => {
    setShowRescheduleForm(false);
    setSelectedBooking(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Potvrdené';
      case 'pending':
        return 'Čaká na potvrdenie';
      case 'completed':
        return 'Dokončené';
      case 'cancelled':
        return 'Zrušené';
      default:
        return status;
    }
  };

  const getServiceTypeText = (serviceType: string) => {
    switch (serviceType) {
      case 'training':
        return 'Individuálny tréning';
      case 'consultation':
        return 'Konzultácia';
      case 'behavior_training':
        return 'Behaviorálny tréning';
      default:
        return serviceType;
    }
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
        Chyba pri načítavaní rezervácií
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Moje rezervácie</h2>
      </div>

      {bookings?.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">Zatiaľ nemáte žiadne rezervácie</div>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings?.map((booking: Booking) => (
            <div key={booking.id} className="card">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {getServiceTypeText(booking.service_type)}
                    </h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(booking.status)}`}>
                      {getStatusText(booking.status)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <div>Pes: <span className="font-medium">{booking.dog.name}</span> ({booking.dog.breed})</div>
                  </div>
                </div>
                
                {booking.status !== 'cancelled' && booking.status !== 'completed' && (
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => handleReschedule(booking)}
                      className="text-gray-400 hover:text-blue-600"
                      title="Preložiť"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleCancel(booking.id)}
                      className="text-gray-400 hover:text-red-600"
                      title="Zrušiť"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Dátum a čas:</span>
                  <div className="text-gray-900">
                    {format(new Date(booking.start_time), 'dd.MM.yyyy HH:mm', { locale: sk })} - {' '}
                    {format(new Date(booking.end_time), 'HH:mm', { locale: sk })}
                  </div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Vytvorené:</span>
                  <div className="text-gray-900">
                    {format(new Date(booking.created_at), 'dd.MM.yyyy HH:mm', { locale: sk })}
                  </div>
                </div>
              </div>

              {booking.notes && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <span className="font-medium text-gray-700">Poznámky:</span>
                  <p className="text-gray-900 mt-1">{booking.notes}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showRescheduleForm && selectedBooking && (
        <BookingForm
          onClose={handleCloseRescheduleForm}
          onSuccess={() => {
            handleCloseRescheduleForm();
            queryClient.invalidateQueries({ queryKey: ['bookings'] });
          }}
        />
      )}
    </div>
  );
} 