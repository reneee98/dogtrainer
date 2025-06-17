import { useState, useEffect } from 'react';
import { apiRequest } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

interface Session {
  id: string;
  title: string;
  description: string;
  location: string;
  start_time: string;
  end_time: string;
  capacity: number;
  price: number;
  session_type: string;
  status: string;
  signups?: any[];
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  session: Session;
  color: string;
}

const TrainerCalendar = () => {
  const { token } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [showSessionModal, setShowSessionModal] = useState(false);

  useEffect(() => {
    if (token) {
      fetchSessions();
    }
  }, [currentDate, token]);

  const fetchSessions = async () => {
    if (!token) {
      console.log('No token available');
      return;
    }

    try {
      setLoading(true);
      console.log('Fetching sessions with token:', token ? 'present' : 'missing');
      
      const response = await apiRequest('/sessions', { token });
      console.log('Sessions response:', response);

      if (response.success && response.data?.data) {
        const sessions = response.data.data;
        console.log('Sessions found:', sessions.length);
        
        const events: CalendarEvent[] = sessions.map((session: Session) => ({
          id: `session-${session.id}`,
          title: session.title,
          start: new Date(session.start_time),
          end: new Date(session.end_time),
          session,
          color: getSessionColor(session.session_type, session.status)
        }));
        
        console.log('Events created:', events);
        setEvents(events);
      } else {
        console.log('No sessions data in response');
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSessionColor = (type: string, status: string) => {
    if (status === 'cancelled') return 'bg-red-100 border-red-300 text-red-800';
    if (status === 'completed') return 'bg-gray-100 border-gray-300 text-gray-600';
    
    switch (type) {
      case 'individual': return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'group': return 'bg-green-100 border-green-300 text-green-800';
      case 'daycare': return 'bg-purple-100 border-purple-300 text-purple-800';
      default: return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedSession(event.session);
    setShowSessionModal(true);
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('sk-SK', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('sk-SK', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-2"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dayEvents = getEventsForDate(date);
      const isToday = date.toDateString() === new Date().toDateString();

      days.push(
        <div key={day} className={`p-2 min-h-[100px] border border-gray-200 ${isToday ? 'bg-blue-50' : 'bg-white'}`}>
          <div className={`text-sm font-medium mb-1 ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
            {day}
          </div>
          <div className="space-y-1">
            {dayEvents.map((event) => (
              <div
                key={event.id}
                onClick={() => handleEventClick(event)}
                className={`text-xs p-1 rounded border cursor-pointer hover:opacity-75 ${event.color}`}
              >
                <div className="font-medium truncate">{event.title}</div>
                <div>{formatTime(event.session.start_time)}</div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return days;
  };

  const getSessionTypeLabel = (type: string) => {
    switch (type) {
      case 'individual': return 'Individuálny';
      case 'group': return 'Skupinový';
      case 'daycare': return 'Jasle';
      default: return type;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'scheduled': return 'Naplánované';
      case 'in_progress': return 'Prebieha';
      case 'completed': return 'Dokončené';
      case 'cancelled': return 'Zrušené';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Calendar Header */}
      <div className="flex justify-between items-center p-6 border-b">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Môj rozvrh</h2>
          <p className="text-gray-600">
            {currentDate.toLocaleDateString('sk-SK', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={previousMonth}
            className="px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
          >
            ←
          </button>
          <button
            onClick={nextMonth}
            className="px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
          >
            →
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-6">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-0 mb-2">
          {['Ne', 'Po', 'Ut', 'St', 'Št', 'Pi', 'So'].map((day) => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-0 border border-gray-200">
          {renderCalendar()}
        </div>
      </div>

      {/* Legend */}
      <div className="p-6 border-t bg-gray-50">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Legenda</h4>
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></div>
            <span>Individuálny tréning</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
            <span>Skupinový tréning</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-purple-100 border border-purple-300 rounded"></div>
            <span>Jasle</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
            <span>Zrušené</span>
          </div>
        </div>
      </div>

      {/* Session Detail Modal */}
      {showSessionModal && selectedSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{selectedSession.title}</h3>
                <button
                  onClick={() => setShowSessionModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Dátum a čas</p>
                  <p className="font-medium">{formatDate(selectedSession.start_time)}</p>
                  <p className="text-sm text-gray-500">
                    {formatTime(selectedSession.start_time)} - {formatTime(selectedSession.end_time)}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Typ</p>
                  <p className="font-medium">{getSessionTypeLabel(selectedSession.session_type)}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Miesto</p>
                  <p className="font-medium">{selectedSession.location}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Kapacita</p>
                  <p className="font-medium">
                    {selectedSession.signups?.filter(s => s.status === 'approved').length || 0} / {selectedSession.capacity}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Cena</p>
                  <p className="font-medium">{selectedSession.price}€</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Stav</p>
                  <p className="font-medium">{getStatusLabel(selectedSession.status)}</p>
                </div>

                {selectedSession.description && (
                  <div>
                    <p className="text-sm text-gray-600">Popis</p>
                    <p className="font-medium">{selectedSession.description}</p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowSessionModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Zavrieť
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainerCalendar; 