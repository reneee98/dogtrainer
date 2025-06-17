import { useState, useEffect } from 'react';
import { apiRequest } from '../lib/api';

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

const OwnerCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
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
    fetchEvents();
    fetchUserDogs();
  }, [currentDate]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      
      const [sessionsResponse] = await Promise.all([
        apiRequest(`/sessions?year=${year}&month=${month}`)
      ]);

      const events: CalendarEvent[] = [];

      // Add sessions
      if (sessionsResponse.success && Array.isArray(sessionsResponse.data?.sessions)) {
        sessionsResponse.data.sessions.forEach((session: Session) => {
          events.push({
            id: `session-${session.id}`,
            title: session.title,
            start: new Date(session.start_time),
            end: new Date(session.end_time),
            type: 'session',
            session,
            color: 'bg-green-100 border-green-300 text-green-800'
          });
        });
      }

      setEvents(events);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDogs = async () => {
    try {
      const response = await apiRequest('/dogs');
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
    if (event.type === 'session' && event.session) {
      try {
        // Fetch full session details
        const response = await apiRequest(`/sessions/${event.session.id}`);
        if (response.success) {
          setSelectedSession(response.data.session);
          setShowSessionModal(true);
        }
      } catch (error) {
        console.error('Error fetching session details:', error);
      }
    }
  };

  const handleBookSession = async () => {
    if (!selectedSession || !selectedDogId) return;
    
    setIsBooking(true);
    try {
      const response = await apiRequest(`/sessions/${selectedSession.id}/signup`, {
        method: 'POST',
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
        fetchEvents(); // Refresh events
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
    if (!selectedSession || !selectedDogId) return;
    
    setIsBooking(true);
    try {
      const response = await apiRequest(`/sessions/${selectedSession.id}/waitlist`, {
        method: 'POST',
        body: JSON.stringify({
          dog_id: selectedDogId,
          notes: bookingNotes
        })
      });

      if (response.success) {
        alert('Úspešne ste sa pridali na čakaciu listinu!');
        setShowSessionModal(false);
        setBookingNotes('');
        fetchEvents(); // Refresh events
      } else {
        alert(response.message || 'Chyba pri pridávaní na čakaciu listinu.');
      }
    } catch (error) {
      console.error('Error joining waitlist:', error);
      alert('Chyba pri pridávaní na čakaciu listinu.');
    } finally {
      setIsBooking(false);
    }
  };

  const isSessionFull = (session: Session): boolean => {
    const approvedSignups = session.signups?.filter(signup => signup.status === 'approved').length || 0;
    return approvedSignups >= session.capacity;
  };

  const isUserSignedUp = (session: Session): boolean => {
    if (!dogs.length) return false;
    const userDogIds = dogs.map(dog => dog.id);
    return session.signups?.some(signup => 
      userDogIds.includes(signup.dog_id) && ['pending', 'approved'].includes(signup.status)
    ) || false;
  };

  const isUserOnWaitlist = (session: Session): boolean => {
    if (!dogs.length) return false;
    const userDogIds = dogs.map(dog => dog.id);
    return session.waitlist?.some(waitlist => 
      userDogIds.includes(waitlist.dog_id)
    ) || false;
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    for (let i = 0; i < 42; i++) {
      days.push(new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000));
    }
    return days;
  };

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toDateString();
    return events.filter(event => event.start.toDateString() === dateStr);
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

  const days = getDaysInMonth(currentDate);
  const monthNames = [
    'Január', 'Február', 'Marec', 'Apríl', 'Máj', 'Jún',
    'Júl', 'August', 'September', 'Október', 'November', 'December'
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>
        <div className="flex space-x-2">
          <button
            onClick={previousMonth}
            className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            ← Predchádzajúci
          </button>
          <button
            onClick={nextMonth}
            className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Nasledujúci →
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 mb-4">
        {['Ne', 'Po', 'Ut', 'St', 'Št', 'Pi', 'So'].map(day => (
          <div key={day} className="p-2 text-center font-semibold text-gray-600 bg-gray-50">
            {day}
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        </div>
      ) : (
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