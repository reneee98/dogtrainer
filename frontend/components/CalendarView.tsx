import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import { sk } from 'date-fns/locale';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { bookingApi, sessionApi } from '../lib/api';

interface CalendarEvent {
  id: number;
  title: string;
  type: 'booking' | 'session' | 'daycare';
  date: string;
  time?: string;
  status?: string;
}

export default function CalendarView() {
  const { token } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const { data: bookings } = useQuery({
    queryKey: ['bookings', format(currentDate, 'yyyy-MM')],
    queryFn: () => bookingApi.list(token!),
    enabled: !!token,
  });

  const { data: sessions } = useQuery({
    queryKey: ['sessions', format(currentDate, 'yyyy-MM')],
    queryFn: () => sessionApi.list(token!),
    enabled: !!token,
  });

  const getEventsForDate = (date: Date): CalendarEvent[] => {
    const events: CalendarEvent[] = [];
    const dateStr = format(date, 'yyyy-MM-dd');

    // Add bookings
    bookings?.filter((booking: any) => booking.start_time.startsWith(dateStr))
      .forEach((booking: any) => {
        events.push({
          id: booking.id,
          title: `Rezervácia - ${booking.service_type}`,
          type: 'booking',
          date: dateStr,
          time: format(new Date(booking.start_time), 'HH:mm'),
          status: booking.status,
        });
      });

    // Add sessions
    sessions?.filter((session: any) => session.start_time.startsWith(dateStr))
      .forEach((session: any) => {
        events.push({
          id: session.id,
          title: session.name,
          type: session.type === 'group_training' ? 'session' : 'daycare',
          date: dateStr,
          time: format(new Date(session.start_time), 'HH:mm'),
          status: session.status,
        });
      });

    return events;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const getEventColor = (type: string, status?: string) => {
    if (status === 'cancelled') return 'bg-gray-300 text-gray-600';
    
    switch (type) {
      case 'booking':
        return 'bg-blue-100 text-blue-800';
      case 'session':
        return 'bg-green-100 text-green-800';
      case 'daycare':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-6 border-b">
        <h2 className="text-lg font-semibold text-gray-900">
          {format(currentDate, 'MMMM yyyy', { locale: sk })}
        </h2>
        <div className="flex space-x-2">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-4 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            Dnes
          </button>
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-6">
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-4">
          {['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne'].map((day) => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const events = getEventsForDate(day);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isTodayDate = isToday(day);

            return (
              <div
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={`
                  min-h-[100px] p-2 border rounded-lg cursor-pointer transition-colors
                  ${isSelected ? 'bg-primary-50 border-primary-300' : 'hover:bg-gray-50'}
                  ${isTodayDate ? 'border-primary-500' : 'border-gray-200'}
                `}
              >
                <div className={`
                  text-sm font-medium mb-1
                  ${isTodayDate ? 'text-primary-600' : 'text-gray-900'}
                `}>
                  {format(day, 'd')}
                </div>

                <div className="space-y-1">
                  {events.slice(0, 3).map((event) => (
                    <div
                      key={`${event.type}-${event.id}`}
                      className={`
                        text-xs px-2 py-1 rounded text-center truncate
                        ${getEventColor(event.type, event.status)}
                      `}
                      title={`${event.title} ${event.time ? `- ${event.time}` : ''}`}
                    >
                      {event.time && (
                        <span className="font-medium">{event.time}</span>
                      )}
                      <div className="truncate">{event.title}</div>
                    </div>
                  ))}
                  {events.length > 3 && (
                    <div className="text-xs text-gray-500 text-center">
                      +{events.length - 3} ďalších
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Date Events */}
      {selectedDate && (
        <div className="border-t p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Udalosti pre {format(selectedDate, 'dd. MMMM yyyy', { locale: sk })}
          </h3>
          
          {getEventsForDate(selectedDate).length === 0 ? (
            <p className="text-gray-500">Žiadne udalosti</p>
          ) : (
            <div className="space-y-2">
              {getEventsForDate(selectedDate).map((event) => (
                <div
                  key={`${event.type}-${event.id}`}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-gray-900">{event.title}</div>
                    {event.time && (
                      <div className="text-sm text-gray-500">{event.time}</div>
                    )}
                  </div>
                  <span className={`
                    px-2 py-1 text-xs rounded-full
                    ${getEventColor(event.type, event.status)}
                  `}>
                    {event.type === 'booking' ? 'Rezervácia' : 
                     event.type === 'session' ? 'Tréning' : 'Jasle'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
} 