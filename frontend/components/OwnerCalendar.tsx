import { useState, useEffect } from 'react';
import { apiRequest } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { ChevronLeftIcon, ChevronRightIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface Dog {
  id: string;
  name: string;
  breed: string;
  age: number;
  gender: string;
  weight: number;
}

interface User {
  id: string;
  name: string;
  email: string;
}

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
  trainer: User;
  available_spots?: number;
  signups?: any[];
  waitlist?: any[];
}

type ViewMode = 'week' | 'month';

const OwnerCalendar = () => {
  const { token } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [selectedDogId, setSelectedDogId] = useState<string>('');
  const [bookingNotes, setBookingNotes] = useState('');
  const [isBooking, setIsBooking] = useState(false);

  useEffect(() => {
    if (token) {
      fetchSessions();
      fetchUserDogs();
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

      // Filter out daycare sessions and only show scheduled sessions
      const filteredSessions = sessionData.filter((session: Session) => 
        session.status === 'scheduled' && session.session_type !== 'daycare'
      );

      setSessions(filteredSessions);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDogs = async () => {
    if (!token) return;
    
    try {
      const response = await apiRequest('/dogs', { token });
      if (response.success && Array.isArray(response.data?.dogs)) {
        setDogs(response.data.dogs);
        if (response.data.dogs.length > 0) {
          setSelectedDogId(response.data.dogs[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching dogs:', error);
    }
  };

  const handleSessionClick = (session: Session) => {
    setSelectedSession(session);
    setShowSessionModal(true);
  };

  const handleBookSession = async () => {
    if (!selectedSession || !selectedDogId || !token) return;
    
    setIsBooking(true);
    try {
      const response = await apiRequest(`/sessions/${selectedSession.id}/signup`, {
        method: 'POST',
        token,
        body: JSON.stringify({
          dog_id: selectedDogId,
          notes: bookingNotes
        })
      });

      if (response.success) {
        alert('Úspešne ste sa prihlásili na tréning! Čakáte na schválenie od trénera.');
        setShowSessionModal(false);
        setBookingNotes('');
        fetchSessions();
      } else {
        alert(response.message || 'Chyba pri prihlasovaní na tréning.');
      }
    } catch (error) {
      console.error('Error booking session:', error);
      alert('Chyba pri prihlasovaní na tréning.');
    } finally {
      setIsBooking(false);
    }
  };

  const isSessionFull = (session: Session): boolean => {
    return session.available_spots !== undefined && session.available_spots <= 0;
  };

  const isUserSignedUp = (session: Session): boolean => {
    return session.signups?.some(signup => 
      dogs.some(dog => dog.id === signup.dog_id)
    ) || false;
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

  const getSessionTypeColor = (type: string) => {
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
                  min-h-[400px] p-3 rounded-lg border transition-all
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
                        ${getSessionTypeColor(session.session_type)} text-white
                      `}
                    >
                      <div className="font-medium text-sm">{session.title}</div>
                      <div className="text-xs opacity-90">
                        {formatTime(session.start_time)} - {formatTime(session.end_time)}
                      </div>
                      <div className="text-xs opacity-75">{session.location}</div>
                      <div className="text-xs opacity-90 mt-1">
                        {session.available_spots !== undefined ? 
                          `${session.capacity - session.available_spots}/${session.capacity} obsadené` :
                          `${session.capacity} miest`
                        }
                      </div>
                    </button>
                  ))}
                  {daySessions.length > 6 && (
                    <div className="text-sm text-gray-500 p-3 text-center bg-gray-50 rounded-lg">
                      +{daySessions.length - 6} ďalších tréningov
                    </div>
                  )}
                </div>
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
                  min-h-[100px] p-2 border border-gray-50 rounded-lg transition-all hover:bg-gray-25
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
                        ${getSessionTypeColor(session.session_type)} text-white
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
                  <span className={`
                    inline-block px-2 py-1 rounded-full text-xs font-medium mt-2
                    ${selectedSession.session_type === 'individual' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-green-100 text-green-800'}
                  `}>
                    {getSessionTypeLabel(selectedSession.session_type)}
                  </span>
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
                        {selectedSession.available_spots !== undefined ? 
                          `${selectedSession.capacity - selectedSession.available_spots}/${selectedSession.capacity}` :
                          `${selectedSession.capacity} miest`
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tréner:</span>
                      <span className="font-medium">{selectedSession.trainer.name}</span>
                    </div>
                  </div>
                </div>

                {selectedSession.description && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Popis</h4>
                    <p className="text-sm text-gray-600">{selectedSession.description}</p>
                  </div>
                )}

                {!isUserSignedUp(selectedSession) && !isSessionFull(selectedSession) && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Vyberte psa
                      </label>
                      <select
                        value={selectedDogId}
                        onChange={(e) => setSelectedDogId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {dogs.map((dog) => (
                          <option key={dog.id} value={dog.id}>
                            {dog.name} ({dog.breed})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Poznámky (voliteľné)
                      </label>
                      <textarea
                        value={bookingNotes}
                        onChange={(e) => setBookingNotes(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Zadajte poznámky pre trénera..."
                      />
                    </div>

                    <button
                      onClick={handleBookSession}
                      disabled={isBooking || !selectedDogId}
                      className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isBooking ? 'Prihlasuje sa...' : 'Prihlásiť sa na tréning'}
                    </button>
                  </div>
                )}

                {isUserSignedUp(selectedSession) && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-green-800 text-sm font-medium">
                      ✓ Už ste prihlásený na tento tréning
                    </p>
                  </div>
                )}

                {isSessionFull(selectedSession) && !isUserSignedUp(selectedSession) && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-amber-800 text-sm font-medium">
                      Tréning je plne obsadený
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerCalendar; 