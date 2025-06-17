import { useState, useEffect } from 'react';
import { apiRequest } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

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

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'session' | 'daycare';
  session?: Session;
  color: string;
}

type ViewMode = 'week' | 'month';

const OwnerCalendar = () => {
  const { token } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [selectedDogId, setSelectedDogId] = useState<string>('');
  const [bookingNotes, setBookingNotes] = useState('');
  const [specialRequirements, setSpecialRequirements] = useState('');
  const [isBooking, setIsBooking] = useState(false);

  useEffect(() => {
    if (token) {
      fetchEvents();
      fetchUserDogs();
    }
  }, [currentDate, token]);

  const fetchEvents = async () => {
    if (!token) return;
    
    try {
      setLoading(true);
      const sessionsResponse = await apiRequest('/sessions', { token });

      console.log('Sessions response:', sessionsResponse);

      const events: CalendarEvent[] = [];

      // Handle different response formats
      let sessions = [];
      if (sessionsResponse.success) {
        if (Array.isArray(sessionsResponse.data)) {
          sessions = sessionsResponse.data;
        } else if (sessionsResponse.data?.sessions && Array.isArray(sessionsResponse.data.sessions)) {
          sessions = sessionsResponse.data.sessions;
        } else if (sessionsResponse.data?.data && Array.isArray(sessionsResponse.data.data)) {
          sessions = sessionsResponse.data.data;
        }
      } else if (Array.isArray(sessionsResponse)) {
        sessions = sessionsResponse;
      }

      console.log('Processed sessions:', sessions);

      // Add sessions to events
      sessions.forEach((session: Session) => {
        if (session.status === 'scheduled') {
          events.push({
            id: `session-${session.id}`,
            title: session.title,
            start: new Date(session.start_time),
            end: new Date(session.end_time),
            type: 'session',
            session,
            color: getSessionColor(session.session_type)
          });
        }
      });

      console.log('Calendar events:', events);
      setEvents(events);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSessionColor = (sessionType: string): string => {
    switch (sessionType) {
      case 'individual':
        return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'group':
        return 'bg-green-100 border-green-300 text-green-800';
      case 'daycare':
        return 'bg-purple-100 border-purple-300 text-purple-800';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800';
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

  const handleEventClick = async (event: CalendarEvent) => {
    if (!token) return;
    
    if (event.type === 'session' && event.session) {
      try {
        const response = await apiRequest(`/sessions/${event.session.id}`, { token });
        if (response.success) {
          setSelectedSession(response.data.session || response.data);
          setShowSessionModal(true);
        }
      } catch (error) {
        console.error('Error fetching session details:', error);
      }
    }
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
          notes: bookingNotes,
          special_requirements: specialRequirements
        })
      });

      if (response.success) {
        alert('Úspešne ste sa prihlásili na tréning! Čakáte na schválenie od trénera.');
        setShowSessionModal(false);
        setBookingNotes('');
        setSpecialRequirements('');
        fetchEvents();
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

  const handleJoinWaitlist = async () => {
    if (!selectedSession || !selectedDogId || !token) return;
    
    setIsBooking(true);
    try {
      const response = await apiRequest(`/sessions/${selectedSession.id}/waitlist`, {
        method: 'POST',
        token,
        body: JSON.stringify({
          dog_id: selectedDogId,
          notes: bookingNotes
        })
      });

      if (response.success) {
        alert('Úspešne ste sa pridali na čakaciu listinu!');
        setShowSessionModal(false);
        setBookingNotes('');
        setSpecialRequirements('');
        fetchEvents();
      } else {
        alert(response.message || 'Chyba pri pridaní na čakaciu listinu.');
      }
    } catch (error) {
      console.error('Error joining waitlist:', error);
      alert('Chyba pri pridaní na čakaciu listinu.');
    } finally {
      setIsBooking(false);
    }
  };

  const isSessionFull = (session: Session): boolean => {
    const approvedSignups = session.signups?.filter(signup => signup.status === 'approved').length || 0;
    return approvedSignups >= session.capacity;
  };

  const isUserSignedUp = (session: Session): boolean => {
    return session.signups?.some(signup => 
      signup.user_id === token && (signup.status === 'pending' || signup.status === 'approved')
    ) || false;
  };

  const isUserOnWaitlist = (session: Session): boolean => {
    return session.waitlist?.some(waitlist => waitlist.user_id === token) || false;
  };

  // Week view functions
  const getWeekDays = (date: Date) => {
    const week = [];
    const startOfWeek = new Date(date);
    // Get Monday as start of week (Monday = 1, Sunday = 0)
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);

    for (let i = 0; i < 7; i++) {
      const weekDay = new Date(startOfWeek);
      weekDay.setDate(startOfWeek.getDate() + i);
      week.push(weekDay);
    }
    return week;
  };

  // Month view functions
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    
    // Start from Monday
    const firstDayOfWeek = firstDay.getDay();
    const mondayOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    startDate.setDate(firstDay.getDate() - mondayOffset);

    const days = [];
    const totalDays = 42; // 6 weeks × 7 days

    for (let i = 0; i < totalDays; i++) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      days.push(day);
    }

    return days;
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

  const getCalendarTitle = () => {
    if (viewMode === 'week') {
      const weekDays = getWeekDays(currentDate);
      const startDate = weekDays[0];
      const endDate = weekDays[6];
      
      if (startDate.getMonth() === endDate.getMonth()) {
        return `${startDate.getDate()}. - ${endDate.getDate()}. ${startDate.toLocaleDateString('sk-SK', { month: 'long', year: 'numeric' })}`;
      } else {
        return `${startDate.toLocaleDateString('sk-SK', { day: 'numeric', month: 'short' })} - ${endDate.toLocaleDateString('sk-SK', { day: 'numeric', month: 'short', year: 'numeric' })}`;
      }
    } else {
      return currentDate.toLocaleDateString('sk-SK', { month: 'long', year: 'numeric' });
    }
  };

  const renderWeekView = () => {
    const weekDays = getWeekDays(currentDate);
    const dayNames = ['Pondelok', 'Utorok', 'Streda', 'Štvrtok', 'Piatok', 'Sobota', 'Nedeľa'];
    
    return (
      <div className="grid grid-cols-7 gap-1">
        {/* Header */}
        {dayNames.map((dayName, index) => {
          const day = weekDays[index];
          const isToday = day.toDateString() === new Date().toDateString();
          
          return (
            <div key={dayName} className="p-3 text-center bg-gray-50 border-b-2 border-gray-200">
              <div className="font-semibold text-gray-700">{dayName}</div>
              <div className={`text-lg font-bold ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                {day.getDate()}
              </div>
            </div>
          );
        })}
        
        {/* Events */}
        {weekDays.map((day, index) => {
          const dayEvents = getEventsForDate(day);
          const isToday = day.toDateString() === new Date().toDateString();
          
          return (
            <div
              key={index}
              className={`min-h-[300px] p-3 border border-gray-100 ${
                isToday ? 'bg-blue-50 border-blue-200' : 'bg-white'
              }`}
            >
              <div className="space-y-2">
                {dayEvents.map((event) => (
                  <div
                    key={event.id}
                    className={`p-2 rounded cursor-pointer hover:opacity-80 transition-opacity border ${event.color}`}
                    onClick={() => handleEventClick(event)}
                  >
                    <div className="font-medium text-sm truncate">{event.title}</div>
                    <div className="text-xs">
                      {formatTime(event.start.toISOString())} - {formatTime(event.end.toISOString())}
                    </div>
                    {event.session && (
                      <div className="text-xs opacity-75">
                        {event.session.location}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderMonthView = () => {
    const days = getDaysInMonth(currentDate);
    const dayNames = ['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne'];
    
    return (
      <>
        {/* Header */}
        <div className="grid grid-cols-7 gap-1 mb-4">
          {dayNames.map(day => (
            <div key={day} className="p-2 text-center font-semibold text-gray-600 bg-gray-50">
              {day}
            </div>
          ))}
        </div>
        
        {/* Days */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => {
            const dayEvents = getEventsForDate(day);
            const isCurrentMonth = day.getMonth() === currentDate.getMonth();
            const isToday = day.toDateString() === new Date().toDateString();

            return (
              <div
                key={index}
                className={`min-h-[100px] p-2 border border-gray-100 ${
                  isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                } ${isToday ? 'bg-blue-50 border-blue-200' : ''}`}
              >
                <div className={`text-sm font-medium mb-1 ${
                  isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                } ${isToday ? 'text-blue-600' : ''}`}>
                  {day.getDate()}
                </div>
                
                <div className="space-y-1">
                  {dayEvents.map((event) => (
                    <div
                      key={event.id}
                      className={`text-xs p-1 rounded cursor-pointer hover:opacity-80 transition-opacity ${event.color}`}
                      onClick={() => handleEventClick(event)}
                    >
                      <div className="font-medium truncate">{event.title}</div>
                      <div className="text-xs">
                        {formatTime(event.start.toISOString())}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          {getCalendarTitle()}
        </h2>
        <div className="flex items-center space-x-3">
          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                viewMode === 'week' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Týždeň
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                viewMode === 'month' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Mesiac
            </button>
          </div>
          
          {/* Navigation */}
          <div className="flex space-x-2">
            <button
              onClick={previousPeriod}
              className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              ← Predchádzajúci
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-2 text-sm bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg transition-colors"
            >
              Dnes
            </button>
            <button
              onClick={nextPeriod}
              className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Nasledujúci →
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        </div>
      ) : (
        <>
          {/* Calendar Content */}
          {viewMode === 'week' ? renderWeekView() : renderMonthView()}
          
          {/* Legend */}
          <div className="flex justify-center space-x-6 mt-6 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
              <span>Individuálny tréning</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
              <span>Skupinový tréning</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-purple-100 border border-purple-300 rounded"></div>
              <span>Jasle</span>
            </div>
          </div>
        </>
      )}

      {/* Session Detail Modal */}
      {showSessionModal && selectedSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-2xl font-bold text-gray-900">{selectedSession.title}</h3>
              <button
                onClick={() => setShowSessionModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            {/* Session Details */}
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Detaily tréningi</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Dátum:</span> {formatDate(selectedSession.start_time)}</p>
                    <p><span className="font-medium">Čas:</span> {formatTime(selectedSession.start_time)} - {formatTime(selectedSession.end_time)}</p>
                    <p><span className="font-medium">Miesto:</span> {selectedSession.location}</p>
                    <p><span className="font-medium">Kapacita:</span> {selectedSession.capacity} psov</p>
                    <p><span className="font-medium">Cena:</span> {selectedSession.price}€</p>
                    <p><span className="font-medium">Typ:</span> {selectedSession.session_type}</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Tréner</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Meno:</span> {selectedSession.trainer.name}</p>
                    <p><span className="font-medium">Email:</span> {selectedSession.trainer.email}</p>
                  </div>
                  
                  <div className="mt-4">
                    <h4 className="font-semibold text-gray-700 mb-2">Dostupnosť</h4>
                    <div className="text-sm">
                      <p>
                        <span className="font-medium">Obsadené miesta:</span> {
                          selectedSession.signups?.filter(signup => signup.status === 'approved').length || 0
                        } / {selectedSession.capacity}
                      </p>
                      {isSessionFull(selectedSession) && (
                        <p className="text-red-600 font-medium">Tréning je plný</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {selectedSession.description && (
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Popis</h4>
                  <p className="text-sm text-gray-600">{selectedSession.description}</p>
                </div>
              )}
            </div>

            {/* Booking Form */}
            {!isUserSignedUp(selectedSession) && !isUserOnWaitlist(selectedSession) && (
              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-700 mb-4">
                  {isSessionFull(selectedSession) ? 'Pridať sa na čakaciu listinu' : 'Prihlásiť sa na tréning'}
                </h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Vyberte psa
                    </label>
                    <select
                      value={selectedDogId}
                      onChange={(e) => setSelectedDogId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {dogs.map(dog => (
                        <option key={dog.id} value={dog.id}>
                          {dog.name} ({dog.breed}, {dog.age} rokov)
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Napíšte poznámky pre trénera..."
                    />
                  </div>

                  {!isSessionFull(selectedSession) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Špeciálne požiadavky (voliteľné)
                      </label>
                      <textarea
                        value={specialRequirements}
                        onChange={(e) => setSpecialRequirements(e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Napríklad: zdravotné problémy, strach z iných psov..."
                      />
                    </div>
                  )}

                  <div className="flex space-x-3">
                    <button
                      onClick={() => setShowSessionModal(false)}
                      className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                    >
                      Zrušiť
                    </button>
                    <button
                      onClick={isSessionFull(selectedSession) ? handleJoinWaitlist : handleBookSession}
                      disabled={isBooking || !selectedDogId}
                      className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors disabled:opacity-50"
                    >
                      {isBooking ? 'Spracováva sa...' : (
                        isSessionFull(selectedSession) ? 'Pridať na čakaciu listinu' : 'Prihlásiť sa'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Already signed up message */}
            {isUserSignedUp(selectedSession) && (
              <div className="border-t pt-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-800 font-medium">
                    Už ste prihlásený na tento tréning. Čakáte na schválenie od trénera.
                  </p>
                </div>
              </div>
            )}

            {/* Already on waitlist message */}
            {isUserOnWaitlist(selectedSession) && (
              <div className="border-t pt-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800 font-medium">
                    Ste na čakacej listine pre tento tréning.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerCalendar; 