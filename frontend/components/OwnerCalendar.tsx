import { useState, useEffect, useRef } from 'react';
import { apiRequest } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { ChevronLeftIcon, ChevronRightIcon, XMarkIcon, CalendarIcon, ListBulletIcon } from '@heroicons/react/24/outline';

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

type ViewMode = 'list' | 'month' | 'week';

const OwnerCalendar = () => {
  const { token } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [selectedDogId, setSelectedDogId] = useState<string>('');
  const [bookingNotes, setBookingNotes] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchEndX, setTouchEndX] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Auto-select best view mode based on screen size
  useEffect(() => {
    const updateViewMode = () => {
      const width = window.innerWidth;
      if (width < 640) { // Mobile
        setViewMode('list');
      } else if (width < 1024) { // Tablet
        setViewMode('month');
      } else { // Desktop
        setViewMode('week');
      }
    };

    updateViewMode();
    window.addEventListener('resize', updateViewMode);
    return () => window.removeEventListener('resize', updateViewMode);
  }, []);

  // Swipe navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStartX || !touchEndX) return;
    
    const distance = touchStartX - touchEndX;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      nextPeriod();
    } else if (isRightSwipe) {
      previousPeriod();
    }
  };

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

  const getSessionsForPeriod = () => {
    if (viewMode === 'list') {
      // Show next 2 weeks for list view
      const now = new Date();
      const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      return sessions
        .filter(session => {
          const sessionDate = new Date(session.start_time);
          return sessionDate >= now && sessionDate <= twoWeeksLater;
        })
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    }
    return sessions;
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('sk-SK', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('sk-SK', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatRelativeDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Dnes';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Zajtra';
    } else {
      return date.toLocaleDateString('sk-SK', { 
        weekday: 'long',
        day: 'numeric',
        month: 'short'
      });
    }
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
    } else if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else {
      // For list view, go back 2 weeks
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() - 14);
      setCurrentDate(newDate);
    }
  };

  const nextPeriod = () => {
    if (viewMode === 'week') {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() + 7);
      setCurrentDate(newDate);
    } else if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else {
      // For list view, go forward 2 weeks
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() + 14);
      setCurrentDate(newDate);
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
    return date.toDateString() === new Date().toDateString();
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth() && date.getFullYear() === currentDate.getFullYear();
  };

  const getCalendarTitle = () => {
    if (viewMode === 'list') {
      return 'Nadchádzajúce tréningy';
    } else if (viewMode === 'week') {
      const weekDays = getWeekDays();
      const start = weekDays[0];
      const end = weekDays[6];
      
      if (start.getMonth() === end.getMonth()) {
        return `${start.getDate()} - ${end.getDate()} ${monthNames[start.getMonth()]} ${start.getFullYear()}`;
      } else {
        return `${start.getDate()} ${monthNames[start.getMonth()]} - ${end.getDate()} ${monthNames[end.getMonth()]} ${start.getFullYear()}`;
      }
    } else {
      return `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }
  };

  // Mobile List View - Primary view for phones
  const renderListView = () => {
    const upcomingSessions = getSessionsForPeriod();
    
    if (upcomingSessions.length === 0) {
      return (
        <div className="text-center py-12">
          <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Žiadne nadchádzajúce tréningy
          </h3>
          <p className="text-gray-500">
            Momentálne nie sú naplánované žiadne tréningy.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {upcomingSessions.map((session) => (
          <div
            key={session.id}
            onClick={() => handleSessionClick(session)}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 active:scale-[0.98] transition-transform cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <div className={`w-3 h-3 rounded-full ${getSessionTypeColor(session.session_type)}`}></div>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {getSessionTypeLabel(session.session_type)}
                  </span>
                </div>
                
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {session.title}
                </h3>
                
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{formatRelativeDate(session.start_time)}</span>
                    <span>•</span>
                    <span>{formatTime(session.start_time)} - {formatTime(session.end_time)}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span>📍 {session.location}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span>👨‍🏫 {session.trainer.name}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col items-end space-y-2">
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900">
                    {session.price}€
                  </div>
                  <div className="text-xs text-gray-500">
                    {session.available_spots !== undefined ? 
                      `${session.capacity - session.available_spots}/${session.capacity}` :
                      `${session.capacity} miest`
                    }
                  </div>
                </div>
                
                {isUserSignedUp(session) && (
                  <div className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                    ✓ Prihlásený
                  </div>
                )}
                
                {isSessionFull(session) && !isUserSignedUp(session) && (
                  <div className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                    Obsadené
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderWeekView = () => {
    const weekDays = getWeekDays();

    return (
      <div className="space-y-4">
        {/* Day headers - Horizontal scroll on mobile */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {weekDayNames.map((dayName, index) => {
            const day = weekDays[index];
            const isTodayDay = isToday(day);

            return (
              <div key={dayName} className="p-2 sm:p-4 text-center bg-gray-50 rounded-lg">
                <div className="text-xs sm:text-sm font-medium text-gray-600 truncate">
                  {window.innerWidth < 640 ? dayName.substring(0, 2) : dayName}
                </div>
                <div className={`text-lg sm:text-2xl font-bold ${isTodayDay ? 'text-blue-600' : 'text-gray-900'}`}>
                  {day.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Sessions - Responsive grid */}
        <div className="grid grid-cols-1 sm:grid-cols-7 gap-2 sm:gap-1">
          {weekDays.map((day, index) => {
            const daySessions = getSessionsForDate(day);
            const isTodayDay = isToday(day);

            return (
              <div key={index} className="sm:hidden">
                {/* Mobile: Show day sessions in list format */}
                {daySessions.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">
                      {weekDayNames[index]}, {day.getDate()}. {monthNames[day.getMonth()]}
                    </h3>
                    <div className="space-y-2">
                      {daySessions.map((session) => (
                        <div
                          key={session.id}
                          onClick={() => handleSessionClick(session)}
                          className={`p-3 rounded-lg cursor-pointer transition-all active:scale-[0.98] ${getSessionTypeColor(session.session_type)} text-white`}
                        >
                          <div className="font-medium text-sm">{session.title}</div>
                          <div className="text-xs opacity-90">
                            {formatTime(session.start_time)} - {formatTime(session.end_time)}
                          </div>
                          <div className="text-xs opacity-75">{session.location}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Desktop/Tablet: Traditional week grid */}
          <div className="hidden sm:grid sm:grid-cols-7 sm:gap-1 sm:col-span-7">
            {weekDays.map((day, index) => {
              const daySessions = getSessionsForDate(day);
              const isTodayDay = isToday(day);

              return (
                <div
                  key={index}
                  className={`
                    min-h-[300px] lg:min-h-[400px] p-2 lg:p-3 rounded-lg border transition-all
                    ${isTodayDay ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-100'}
                  `}
                >
                  <div className="space-y-2">
                    {daySessions.slice(0, 4).map((session) => (
                      <button
                        key={session.id}
                        onClick={() => handleSessionClick(session)}
                        className={`
                          w-full text-left p-2 lg:p-3 rounded-lg transition-all hover:scale-105 cursor-pointer
                          ${getSessionTypeColor(session.session_type)} text-white
                        `}
                      >
                        <div className="font-medium text-xs lg:text-sm">{session.title}</div>
                        <div className="text-xs opacity-90">
                          {formatTime(session.start_time)} - {formatTime(session.end_time)}
                        </div>
                        <div className="text-xs opacity-75 truncate">{session.location}</div>
                        <div className="text-xs opacity-90 mt-1">
                          {session.available_spots !== undefined ? 
                            `${session.capacity - session.available_spots}/${session.capacity}` :
                            `${session.capacity} miest`
                          }
                        </div>
                      </button>
                    ))}
                    {daySessions.length > 4 && (
                      <div className="text-xs text-gray-500 p-2 text-center bg-gray-50 rounded-lg">
                        +{daySessions.length - 4} ďalších
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    // Get sessions for selected date (only on mobile)
    const selectedDateSessions = selectedDate ? getSessionsForDate(selectedDate) : [];
    
    return (
      <div className="space-y-4">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-0 mb-2">
          {dayNames.map((day) => (
            <div key={day} className="h-8 flex items-center justify-center">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {day}
              </span>
            </div>
          ))}
        </div>

        {/* Calendar days - Apple style compact */}
        <div className="grid grid-cols-7 gap-0 bg-white rounded-xl overflow-hidden">
          {getDaysInMonth().map((date, index) => {
            const daySessions = getSessionsForDate(date);
            const isCurrentMonthDay = isCurrentMonth(date);
            const isTodayDay = isToday(date);
            const isSelected = selectedDate && 
              selectedDate.getDate() === date.getDate() && 
              selectedDate.getMonth() === date.getMonth();

            return (
              <button
                key={index}
                onClick={() => {
                  // Only set selected date on mobile when there are sessions
                  if (window.innerWidth < 640 && daySessions.length > 0) {
                    setSelectedDate(date);
                  } else if (window.innerWidth >= 640 && daySessions.length > 0) {
                    // On desktop, show modal for first session
                    handleSessionClick(daySessions[0]);
                  }
                }}
                className={`
                  h-12 sm:h-16 lg:h-20 relative flex flex-col items-center justify-center
                  border-r border-b border-gray-100 last:border-r-0
                  transition-all duration-200 hover:bg-gray-50 active:bg-gray-100
                  ${!isCurrentMonthDay ? 'opacity-30' : ''}
                  ${isTodayDay ? 'bg-blue-50' : ''}
                  ${isSelected ? 'bg-blue-100 ring-2 ring-blue-500 ring-inset' : ''}
                  ${daySessions.length > 0 ? 'cursor-pointer' : 'cursor-default'}
                `}
                disabled={!isCurrentMonthDay || daySessions.length === 0}
              >
                {/* Date number */}
                <div className={`
                  text-sm sm:text-base font-medium mb-1
                  ${isTodayDay ? 'bg-blue-500 text-white w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs sm:text-sm' : 
                    isCurrentMonthDay ? 'text-gray-900' : 'text-gray-400'}
                `}>
                  {date.getDate()}
                </div>
                
                {/* Activity indicators - Apple style dots/lines */}
                {daySessions.length > 0 && (
                  <div className="flex items-center justify-center space-x-0.5 absolute bottom-1 sm:bottom-2">
                    {daySessions.slice(0, 4).map((session, idx) => {
                      const color = session.session_type === 'individual' ? 'bg-blue-500' : 
                                   session.session_type === 'group' ? 'bg-green-500' : 'bg-purple-500';
                      
                      return daySessions.length === 1 ? (
                        // Single session - line
                        <div
                          key={idx}
                          className={`w-4 sm:w-6 h-0.5 sm:h-1 rounded-full ${color}`}
                        />
                      ) : (
                        // Multiple sessions - dots
                        <div
                          key={idx}
                          className={`w-1 sm:w-1.5 h-1 sm:h-1.5 rounded-full ${color}`}
                        />
                      );
                    })}
                    {daySessions.length > 4 && (
                      <div className="w-1 sm:w-1.5 h-1 sm:h-1.5 rounded-full bg-gray-400" />
                    )}
                  </div>
                )}

                {/* Desktop hover preview */}
                {daySessions.length > 0 && window.innerWidth >= 640 && (
                  <div className="hidden group-hover:block absolute top-full left-0 z-20 mt-1 w-48 p-2 bg-white rounded-lg shadow-lg border border-gray-200">
                    {daySessions.slice(0, 3).map((session) => (
                      <div key={session.id} className="text-xs text-left p-1">
                        <div className="font-medium text-gray-900 truncate">{session.title}</div>
                        <div className="text-gray-500">{formatTime(session.start_time)}</div>
                      </div>
                    ))}
                    {daySessions.length > 3 && (
                      <div className="text-xs text-gray-500 px-1">+{daySessions.length - 3} viac</div>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Mobile: Selected date sessions list */}
        {selectedDate && selectedDateSessions.length > 0 && (
          <div className="sm:hidden mt-6 bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">
                  {formatDate(selectedDate.toISOString())}
                </h3>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {selectedDateSessions.map((session) => {
                const typeColor = getSessionTypeColor(session.session_type);
                const isSignedUp = isUserSignedUp(session);
                const isFull = isSessionFull(session);
                
                return (
                  <button
                    key={session.id}
                    onClick={() => handleSessionClick(session)}
                    className="w-full p-4 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-start space-x-3">
                      {/* Time & Status indicator */}
                      <div className="flex flex-col items-center space-y-1 flex-shrink-0">
                        <div className="text-sm font-medium text-gray-900">
                          {formatTime(session.start_time)}
                        </div>
                        <div className={`w-2 h-2 rounded-full ${
                          typeColor.includes('blue') ? 'bg-blue-500' :
                          typeColor.includes('green') ? 'bg-green-500' : 'bg-purple-500'
                        }`} />
                      </div>
                      
                      {/* Session details */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-base font-medium text-gray-900 truncate">
                          {session.title}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {getSessionTypeLabel(session.session_type)} • {session.trainer.name}
                        </p>
                        {session.location && (
                          <p className="text-sm text-gray-500 mt-1">
                            📍 {session.location}
                          </p>
                        )}
                        
                        {/* Status badges */}
                        <div className="flex items-center space-x-2 mt-2">
                          {isSignedUp && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              ✓ Prihlásený
                            </span>
                          )}
                          {isFull && !isSignedUp && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Obsadené
                            </span>
                          )}
                          {session.available_spots !== undefined && session.available_spots > 0 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {session.available_spots} miest
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Price */}
                      <div className="text-right flex-shrink-0">
                        <div className="text-lg font-bold text-gray-900">
                          {session.price}€
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Mobile: Today's sessions quick preview */}
        {!selectedDate && (
          <div className="sm:hidden">
            {(() => {
              const todaySessions = getSessionsForDate(new Date());
              if (todaySessions.length === 0) return null;
              
              return (
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <h3 className="font-semibold text-blue-900 mb-3">Dnešné tréningy</h3>
                  <div className="space-y-2">
                    {todaySessions.slice(0, 2).map((session) => (
                      <button
                        key={session.id}
                        onClick={() => handleSessionClick(session)}
                        className="w-full flex items-center justify-between p-3 bg-white rounded-lg border border-blue-200 hover:bg-blue-25 active:bg-blue-100 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="text-sm font-medium text-blue-900">
                            {formatTime(session.start_time)}
                          </div>
                          <div className="text-sm text-blue-800 truncate">
                            {session.title}
                          </div>
                        </div>
                        <div className="text-sm font-bold text-blue-900">
                          {session.price}€
                        </div>
                      </button>
                    ))}
                    {todaySessions.length > 2 && (
                      <div className="text-center text-sm text-blue-700">
                        +{todaySessions.length - 2} viac tréningov
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
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
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
            {/* Title and Today button */}
            <div className="flex items-center justify-between sm:justify-start sm:space-x-4">
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 truncate">
                {getCalendarTitle()}
              </h1>
              <button
                onClick={goToToday}
                className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors flex-shrink-0"
              >
                Dnes
              </button>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between sm:justify-end sm:space-x-4">
              {/* View Mode Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-2 sm:px-3 py-1.5 text-xs sm:text-sm rounded-md transition-colors flex items-center space-x-1 ${
                    viewMode === 'list' 
                      ? 'bg-white text-gray-900 shadow-sm font-medium' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <ListBulletIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Zoznam</span>
                </button>
                <button
                  onClick={() => setViewMode('month')}
                  className={`px-2 sm:px-3 py-1.5 text-xs sm:text-sm rounded-md transition-colors flex items-center space-x-1 ${
                    viewMode === 'month' 
                      ? 'bg-white text-gray-900 shadow-sm font-medium' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <CalendarIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Mesiac</span>
                </button>
                <button
                  onClick={() => setViewMode('week')}
                  className={`px-2 sm:px-3 py-1.5 text-xs sm:text-sm rounded-md transition-colors hidden sm:flex items-center space-x-1 ${
                    viewMode === 'week' 
                      ? 'bg-white text-gray-900 shadow-sm font-medium' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <span>Týždeň</span>
                </button>
              </div>
              
              {/* Navigation */}
              <div className="flex items-center space-x-1">
                <button
                  onClick={previousPeriod}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors touch-manipulation"
                >
                  <ChevronLeftIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={nextPeriod}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors touch-manipulation"
                >
                  <ChevronRightIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar Content with swipe support */}
        <div 
          ref={calendarRef}
          className="p-4 sm:p-6"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {viewMode === 'list' ? renderListView() : 
           viewMode === 'week' ? renderWeekView() : 
           renderMonthView()}
        </div>

        {/* Legend - Hidden on mobile */}
        <div className="hidden sm:block px-6 pb-6">
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

      {/* Mobile-Optimized Session Modal */}
      {showSessionModal && selectedSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg sm:w-full max-h-[90vh] sm:max-h-[90vh] overflow-hidden">
            {/* Mobile handle bar */}
            <div className="flex justify-center py-3 sm:hidden">
              <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
            </div>

            <div className="overflow-y-auto max-h-[85vh] sm:max-h-[80vh]">
              <div className="p-4 sm:p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">
                      {selectedSession.title}
                    </h3>
                    <span className={`
                      inline-block px-3 py-1 rounded-full text-sm font-medium
                      ${selectedSession.session_type === 'individual' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'}
                    `}>
                      {getSessionTypeLabel(selectedSession.session_type)}
                    </span>
                  </div>
                  <button
                    onClick={() => setShowSessionModal(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Detaily tréningy</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600">Dátum</span>
                        <span className="font-medium text-gray-900">
                          {formatRelativeDate(selectedSession.start_time)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600">Čas</span>
                        <span className="font-medium text-gray-900">
                          {formatTime(selectedSession.start_time)} - {formatTime(selectedSession.end_time)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600">Miesto</span>
                        <span className="font-medium text-gray-900">{selectedSession.location}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600">Cena</span>
                        <span className="font-medium text-gray-900 text-lg">{selectedSession.price}€</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600">Obsadenosť</span>
                        <span className="font-medium text-gray-900">
                          {selectedSession.available_spots !== undefined ? 
                            `${selectedSession.capacity - selectedSession.available_spots}/${selectedSession.capacity} miest` :
                            `${selectedSession.capacity} miest dostupných`
                          }
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-gray-600">Tréner</span>
                        <span className="font-medium text-gray-900">{selectedSession.trainer.name}</span>
                      </div>
                    </div>
                  </div>

                  {selectedSession.description && (
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-3">Popis tréningy</h4>
                      <p className="text-gray-600 leading-relaxed">{selectedSession.description}</p>
                    </div>
                  )}

                  {!isUserSignedUp(selectedSession) && !isSessionFull(selectedSession) && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-3">
                          Vyberte psa
                        </label>
                        <select
                          value={selectedDogId}
                          onChange={(e) => setSelectedDogId(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                        >
                          {dogs.map((dog) => (
                            <option key={dog.id} value={dog.id}>
                              {dog.name} ({dog.breed})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-3">
                          Poznámky pre trénera (voliteľné)
                        </label>
                        <textarea
                          value={bookingNotes}
                          onChange={(e) => setBookingNotes(e.target.value)}
                          rows={4}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-base"
                          placeholder="Napríklad: zvláštne potreby psa, zdravotné obmedzenia, ciele tréningy..."
                        />
                      </div>

                      <button
                        onClick={handleBookSession}
                        disabled={isBooking || !selectedDogId}
                        className="w-full bg-blue-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation"
                      >
                        {isBooking ? 'Prihlasuje sa...' : 'Prihlásiť sa na tréning'}
                      </button>
                    </div>
                  )}

                  {isUserSignedUp(selectedSession) && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-green-600 text-lg">✓</span>
                        </div>
                        <div>
                          <p className="text-green-800 font-medium">
                            Už ste prihlásený na tento tréning
                          </p>
                          <p className="text-green-700 text-sm">
                            Čakáte na potvrdenie od trénera
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {isSessionFull(selectedSession) && !isUserSignedUp(selectedSession) && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                          <span className="text-amber-600 text-lg">⚠</span>
                        </div>
                        <div>
                          <p className="text-amber-800 font-medium">
                            Tréning je plne obsadený
                          </p>
                          <p className="text-amber-700 text-sm">
                            Všetky miesta sú už rezervované
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerCalendar; 