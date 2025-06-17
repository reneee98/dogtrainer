import { useState, useEffect } from 'react';
import { apiRequest } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { ChevronLeftIcon, ChevronRightIcon, XMarkIcon, PlusIcon } from '@heroicons/react/24/outline';
import SessionForm from './SessionForm';

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

type ViewMode = 'week' | 'month';

const TrainerCalendar = () => {
  const { token } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    if (token) {
      fetchSessions();
    }
  }, [currentDate, token]);

  const fetchSessions = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const response = await apiRequest('/sessions', { token });

      let sessionData = [];
      if (response.success) {
        if (Array.isArray(response.data)) {
          sessionData = response.data;
        } else if (response.data?.data && Array.isArray(response.data.data)) {
          sessionData = response.data.data;
        }
      }

      // Filter out daycare sessions (tréner nepotrebuje daycare pre tento kalendár)
      const filteredSessions = sessionData.filter((session: Session) => 
        session.session_type !== 'daycare'
      );

      setSessions(filteredSessions);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSessionClick = (session: Session) => {
    setSelectedSession(session);
    setShowSessionModal(true);
  };

  const handleCreateSessionClick = (date: Date) => {
    setSelectedDate(date);
    setShowSessionForm(true);
  };

  const handleSessionFormClose = () => {
    setShowSessionForm(false);
    setSelectedDate(null);
  };

  const handleSessionFormSuccess = () => {
    setShowSessionForm(false);
    setSelectedDate(null);
    fetchSessions(); // Refresh sessions after creating/updating
  };

  const getSessionsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return sessions.filter(session => {
      const sessionDate = new Date(session.start_time).toISOString().split('T')[0];
      return sessionDate === dateStr;
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('sk-SK', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSessionTypeColor = (type: string, status?: string) => {
    if (status === 'cancelled') return 'bg-red-500';
    if (status === 'completed') return 'bg-gray-400';
    
    switch (type) {
      case 'individual':
        return 'bg-blue-500';
      case 'group':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getSessionTypeLabel = (type: string) => {
    switch (type) {
      case 'individual':
        return 'Individuálny';
      case 'group':
        return 'Skupinový';
      default:
        return type;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'scheduled': return 'Naplánované';
      case 'completed': return 'Dokončené';
      case 'cancelled': return 'Zrušené';
      default: return status;
    }
  };

  const previousPeriod = () => {
    if (viewMode === 'week') {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() - 7);
      setCurrentDate(newDate);
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    }
  };

  const nextPeriod = () => {
    if (viewMode === 'week') {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() + 7);
      setCurrentDate(newDate);
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getWeekDays = () => {
    const week = [];
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Start on Monday
    startOfWeek.setDate(diff);

    for (let i = 0; i < 7; i++) {
      const weekDay = new Date(startOfWeek);
      weekDay.setDate(startOfWeek.getDate() + i);
      week.push(weekDay);
    }
    return week;
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const monthNames = [
    'Január', 'Február', 'Marec', 'Apríl', 'Máj', 'Jún',
    'Júl', 'August', 'September', 'Október', 'November', 'December'
  ];

  const dayNames = ['Ne', 'Po', 'Ut', 'St', 'Št', 'Pi', 'So'];
  const weekDayNames = ['Pondelok', 'Utorok', 'Streda', 'Štvrtok', 'Piatok', 'Sobota', 'Nedeľa'];

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  const getCalendarTitle = () => {
    if (viewMode === 'week') {
      const weekDays = getWeekDays();
      const startDate = weekDays[0];
      const endDate = weekDays[6];
      
      if (startDate.getMonth() === endDate.getMonth()) {
        return `${startDate.getDate()}. - ${endDate.getDate()}. ${monthNames[startDate.getMonth()]} ${startDate.getFullYear()}`;
      } else {
        return `${startDate.getDate()}. ${monthNames[startDate.getMonth()]} - ${endDate.getDate()}. ${monthNames[endDate.getMonth()]} ${endDate.getFullYear()}`;
      }
    } else {
      return `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }
  };

  const renderWeekView = () => {
    const weekDays = getWeekDays();

    return (
      <div className="space-y-2">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1">
          {weekDayNames.map((dayName, index) => {
            const day = weekDays[index];
            const isTodayDay = isToday(day);

            return (
              <div key={dayName} className="p-4 text-center bg-gray-50 rounded-lg">
                <div className="text-sm font-medium text-gray-600">{dayName}</div>
                <div className={`text-2xl font-bold ${isTodayDay ? 'text-blue-600' : 'text-gray-900'}`}>
                  {day.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Sessions */}
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((day, index) => {
            const daySessions = getSessionsForDate(day);
            const isTodayDay = isToday(day);

            return (
              <div
                key={index}
                className={`
                  relative min-h-[400px] p-3 rounded-lg border transition-all
                  hover:border-gray-200 hover:shadow-sm group
                  ${isTodayDay ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-100'}
                `}
              >
                <div className="space-y-2">
                  {daySessions.slice(0, 6).map((session) => (
                    <button
                      key={session.id}
                      onClick={() => handleSessionClick(session)}
                      className={`
                        w-full text-left p-3 rounded-lg transition-all hover:scale-105 cursor-pointer
                        ${getSessionTypeColor(session.session_type, session.status)} text-white
                      `}
                    >
                      <div className="font-medium text-sm">{session.title}</div>
                      <div className="text-xs opacity-90">
                        {formatTime(session.start_time)} - {formatTime(session.end_time)}
                      </div>
                      <div className="text-xs opacity-75">{session.location}</div>
                      {session.signups && (
                        <div className="text-xs opacity-90 mt-1">
                          {session.signups.length}/{session.capacity} účastníkov
                        </div>
                      )}
                    </button>
                  ))}
                  {daySessions.length > 6 && (
                    <div className="text-sm text-gray-500 p-3 text-center bg-gray-50 rounded-lg">
                      +{daySessions.length - 6} ďalších tréningov
                    </div>
                  )}
                </div>

                {/* Plus Icon for Creating New Session */}
                <button
                  onClick={() => handleCreateSessionClick(day)}
                  className="
                    absolute top-3 right-3 p-2 rounded-full bg-blue-500 text-white
                    opacity-0 group-hover:opacity-100 transition-all duration-200
                    hover:bg-blue-600 hover:scale-110 transform
                    focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                  "
                  title="Vytvoriť nový tréning"
                >
                  <PlusIcon className="h-5 w-5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    return (
      <div className="space-y-2">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map((day) => (
            <div key={day} className="h-8 flex items-center justify-center">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                {day}
              </span>
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1">
          {getDaysInMonth().map((date, index) => {
            const daySessions = getSessionsForDate(date);
            const isCurrentMonthDay = isCurrentMonth(date);
            const isTodayDay = isToday(date);

            return (
              <div
                key={index}
                className={`
                  relative min-h-[100px] p-2 border border-gray-50 rounded-lg transition-all 
                  hover:bg-gray-25 hover:border-gray-200 hover:shadow-sm group
                  ${!isCurrentMonthDay ? 'opacity-30' : ''}
                  ${isTodayDay ? 'bg-blue-50 border-blue-200' : 'bg-white'}
                `}
              >
                <div className={`
                  text-sm font-medium mb-1
                  ${isTodayDay ? 'text-blue-600' : isCurrentMonthDay ? 'text-gray-900' : 'text-gray-400'}
                `}>
                  {date.getDate()}
                </div>
                
                <div className="space-y-1">
                  {daySessions.slice(0, 3).map((session) => (
                    <button
                      key={session.id}
                      onClick={() => handleSessionClick(session)}
                      className={`
                        w-full text-left px-2 py-1 rounded-md text-xs font-medium
                        transition-all hover:scale-105 cursor-pointer
                        ${getSessionTypeColor(session.session_type, session.status)} text-white
                      `}
                    >
                      <div className="truncate">{session.title}</div>
                      <div className="text-xs opacity-90">
                        {formatTime(session.start_time)}
                      </div>
                    </button>
                  ))}
                  {daySessions.length > 3 && (
                    <div className="text-xs text-gray-500 px-2">
                      +{daySessions.length - 3} viac
                    </div>
                  )}
                </div>

                {/* Plus Icon for Creating New Session */}
                {isCurrentMonthDay && (
                  <button
                    onClick={() => handleCreateSessionClick(date)}
                    className="
                      absolute top-2 right-2 p-1 rounded-full bg-blue-500 text-white
                      opacity-0 group-hover:opacity-100 transition-all duration-200
                      hover:bg-blue-600 hover:scale-110 transform
                      focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                    "
                    title="Vytvoriť nový tréning"
                  >
                    <PlusIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-semibold text-gray-900">
                {getCalendarTitle()}
              </h1>
              <button
                onClick={goToToday}
                className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                Dnes
              </button>
            </div>
            <div className="flex items-center space-x-4">
              {/* View Mode Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('week')}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    viewMode === 'week' 
                      ? 'bg-white text-gray-900 shadow-sm font-medium' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Týždeň
                </button>
                <button
                  onClick={() => setViewMode('month')}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    viewMode === 'month' 
                      ? 'bg-white text-gray-900 shadow-sm font-medium' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Mesiac
                </button>
              </div>
              
              {/* Navigation */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={previousPeriod}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <ChevronLeftIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={nextPeriod}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <ChevronRightIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar Content */}
        <div className="p-6">
          {viewMode === 'week' ? renderWeekView() : renderMonthView()}
        </div>

        {/* Legend */}
        <div className="px-6 pb-6">
          <div className="flex justify-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span>Individuálny tréning</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span>Skupinový tréning</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span>Zrušené</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-gray-400 rounded"></div>
              <span>Dokončené</span>
            </div>
          </div>
        </div>
      </div>

      {/* Session Detail Modal */}
      {showSessionModal && selectedSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {selectedSession.title}
                  </h3>
                  <div className="flex items-center space-x-2 mt-2">
                    <span className={`
                      inline-block px-2 py-1 rounded-full text-xs font-medium
                      ${selectedSession.session_type === 'individual' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'}
                    `}>
                      {getSessionTypeLabel(selectedSession.session_type)}
                    </span>
                    <span className={`
                      inline-block px-2 py-1 rounded-full text-xs font-medium
                      ${selectedSession.status === 'scheduled' ? 'bg-green-100 text-green-800' :
                        selectedSession.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'}
                    `}>
                      {getStatusLabel(selectedSession.status)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowSessionModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Detaily</h4>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Dátum:</span>
                      <span className="font-medium">
                        {new Date(selectedSession.start_time).toLocaleDateString('sk-SK')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Čas:</span>
                      <span className="font-medium">
                        {formatTime(selectedSession.start_time)} - {formatTime(selectedSession.end_time)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Miesto:</span>
                      <span className="font-medium">{selectedSession.location}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cena:</span>
                      <span className="font-medium">{selectedSession.price}€</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Kapacita:</span>
                      <span className="font-medium">
                        {selectedSession.signups?.length || 0}/{selectedSession.capacity}
                      </span>
                    </div>
                  </div>
                </div>

                {selectedSession.description && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Popis</h4>
                    <p className="text-sm text-gray-600">{selectedSession.description}</p>
                  </div>
                )}

                {selectedSession.signups && selectedSession.signups.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Účastníci</h4>
                    <div className="space-y-2">
                      {selectedSession.signups.map((signup: any, index: number) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                          <span className="text-sm">{signup.dog?.name || 'Neznámy pes'}</span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            signup.status === 'approved' ? 'bg-green-100 text-green-800' :
                            signup.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {signup.status === 'approved' ? 'Schválené' :
                             signup.status === 'pending' ? 'Čaká' : 'Zamietnuté'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Session Form Modal */}
      {showSessionForm && selectedDate && (
        <SessionForm
          date={selectedDate}
          onClose={handleSessionFormClose}
          onSuccess={handleSessionFormSuccess}
        />
      )}
    </div>
  );
};

export default TrainerCalendar; 