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
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
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
          <p className="text-gray-500 mb-6">
            Momentálne nie sú naplánované žiadne tréningy.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {/* Training Sessions List - Simple rows for mobile */}
        {upcomingSessions.map((session) => (
          <div
            key={session.id}
            onClick={() => handleSessionClick(session)}
            className={`bg-white rounded-lg border border-gray-200 p-3 transition-all duration-200 cursor-pointer hover:shadow-sm`}
          >
            {/* Mobile: Simple row layout */}
            <div className="sm:hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${getSessionTypeColor(session.session_type)} flex-shrink-0`}></div>
                  <div>
                    <div className="font-medium text-gray-900 text-sm">
                      {formatTime(session.start_time)} - {session.title}
                    </div>
                    <div className="text-xs text-gray-500">
                      {session.location} • {session.signups?.length || 0}/{session.capacity}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900">{session.price}€</div>
                  {isUserSignedUp(session) ? (
                    <div className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                      Prihlásený
                    </div>
                  ) : isSessionFull(session) ? (
                    <div className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                      Plný
                    </div>
                  ) : (
                    <div className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                      Dostupný
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Desktop: Enhanced row layout with more details */}
            <div className="hidden sm:block">
              <div className="space-y-3">
                {/* Main row with all key info */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    <div className={`w-3 h-3 rounded-full ${getSessionTypeColor(session.session_type)} flex-shrink-0`}></div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {formatTime(session.start_time)} - {formatTime(session.end_time)} • {session.title}
                      </div>
                      <div className="text-sm text-gray-500 mt-0.5">
                        {session.location} • {session.trainer.name} • {session.signups?.length || 0}/{session.capacity} účastníkov
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {isUserSignedUp(session) ? (
                      <div className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                        Prihlásený
                      </div>
                    ) : isSessionFull(session) ? (
                      <div className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">
                        Plný
                      </div>
                    ) : (
                      <div className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                        Dostupný
                      </div>
                    )}
                    <div className="text-lg font-semibold text-gray-900">
                      {session.price}€
                    </div>
                  </div>
                </div>

                {/* Progress bar and additional details */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    {session.capacity > 0 && (
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">Obsadenosť:</span>
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className="h-2 rounded-full bg-blue-500"
                            style={{ width: `${Math.min(((session.signups?.length || 0) / session.capacity) * 100, 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-500">
                          {Math.round(((session.signups?.length || 0) / session.capacity) * 100)}%
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Session Type */}
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500 uppercase tracking-wide">
                      {getSessionTypeLabel(session.session_type)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderWeekView = () => {
    const weekDays = getWeekDays();

    const toggleDayExpansion = (dayKey: string) => {
      const newExpanded = new Set(expandedDays);
      if (newExpanded.has(dayKey)) {
        newExpanded.delete(dayKey);
      } else {
        newExpanded.add(dayKey);
      }
      setExpandedDays(newExpanded);
    };

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
                          className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="text-sm font-medium text-gray-900">
                              {formatTime(session.start_time)}
                            </div>
                            <div className="text-sm text-gray-900">
                              {session.title}
                            </div>
                          </div>
                          <div className={`w-2 h-2 rounded-full ${
                            session.session_type === 'individual' ? 'bg-blue-500' :
                            session.session_type === 'group' ? 'bg-green-500' : 'bg-purple-500'
                          }`} />
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
              const dayKey = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
              const isExpanded = expandedDays.has(dayKey);
              const visibleSessions = isExpanded ? daySessions : daySessions.slice(0, 3);
              const hasMore = daySessions.length > 3;

              return (
                <div
                  key={index}
                  className={`
                    min-h-[300px] lg:min-h-[400px] p-2 lg:p-3 rounded-lg border transition-all
                    ${isTodayDay ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-100'}
                  `}
                >
                  <div className="space-y-1">
                    {visibleSessions.map((session) => (
                      <button
                        key={session.id}
                        onClick={() => handleSessionClick(session)}
                        className={`
                          w-full text-left p-2 rounded-md transition-all hover:scale-[1.02] cursor-pointer border
                          ${session.session_type === 'individual' 
                            ? 'bg-blue-50 border-blue-200 hover:bg-blue-100' 
                            : session.session_type === 'group'
                            ? 'bg-green-50 border-green-200 hover:bg-green-100'
                            : 'bg-purple-50 border-purple-200 hover:bg-purple-100'
                          }
                        `}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-gray-900 truncate pr-2">
                              {session.title}
                            </div>
                            <div className="text-xs text-gray-600 mt-0.5">
                              {session.available_spots !== undefined ? 
                                `${session.capacity - session.available_spots}/${session.capacity}` :
                                `${session.capacity} miest`
                              }
                            </div>
                          </div>
                          <div className="text-xs font-medium text-gray-700 flex-shrink-0">
                            {formatTime(session.start_time)}
                          </div>
                        </div>
                      </button>
                    ))}
                    
                    {hasMore && (
                      <button
                        onClick={() => toggleDayExpansion(dayKey)}
                        className="w-full text-xs text-gray-500 p-2 text-center bg-gray-50 hover:bg-gray-100 rounded-md transition-colors border border-gray-200"
                      >
                        {isExpanded 
                          ? `Skryť ${daySessions.length - 3} ${daySessions.length - 3 === 1 ? 'tréning' : daySessions.length - 3 <= 4 ? 'tréningy' : 'tréningov'}`
                          : `+${daySessions.length - 3} ${daySessions.length - 3 === 1 ? 'ďalší' : 'ďalších'}`
                        }
                      </button>
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
          <div className="sm:hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">
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
            <div className="space-y-3 p-4">
              {selectedDateSessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => handleSessionClick(session)}
                  className="bg-gray-50 rounded-lg p-3 cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${getSessionTypeColor(session.session_type)} flex-shrink-0`}></div>
                      <div>
                        <div className="font-medium text-gray-900 text-sm">
                          {formatTime(session.start_time)} - {session.title}
                        </div>
                        <div className="text-xs text-gray-500">
                          {session.location} • {session.signups?.length || 0}/{session.capacity}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900">{session.price}€</div>
                      {isUserSignedUp(session) ? (
                        <div className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                          Prihlásený
                        </div>
                      ) : isSessionFull(session) ? (
                        <div className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                          Plný
                        </div>
                      ) : (
                        <div className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                          Dostupný
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
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
                <div className="bg-blue-50 border-t border-blue-100">
                  <div className="px-4 py-3">
                    <h3 className="font-medium text-blue-900 mb-2">Dnešné tréningy</h3>
                    <div className="space-y-1">
                      {todaySessions.slice(0, 3).map((session) => (
                        <button
                          key={session.id}
                          onClick={() => handleSessionClick(session)}
                          className="w-full flex items-center justify-between py-2 hover:bg-blue-100 rounded-md transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="text-sm font-medium text-blue-900">
                              {formatTime(session.start_time)}
                            </div>
                            <div className="text-sm text-blue-800">
                              {session.title}
                            </div>
                          </div>
                        </button>
                      ))}
                      {todaySessions.length > 3 && (
                        <div className="text-center text-xs text-blue-700 pt-1">
                          +{todaySessions.length - 3} viac
                        </div>
                      )}
                    </div>
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
    <div className="w-full">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-100">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Title and Today button */}
            <div className="flex items-center space-x-3">
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900">
                {getCalendarTitle()}
              </h1>
              <button
                onClick={goToToday}
                className="px-2 py-1 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
              >
                Dnes
              </button>
            </div>

            {/* Controls */}
            <div className="flex items-center space-x-2">
              {/* View Mode Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-2 py-1 text-xs rounded-md transition-colors flex items-center ${
                    viewMode === 'list' 
                      ? 'bg-white text-gray-900 shadow-sm font-medium' 
                      : 'text-gray-600'
                  }`}
                >
                  <ListBulletIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('month')}
                  className={`px-2 py-1 text-xs rounded-md transition-colors flex items-center ${
                    viewMode === 'month' 
                      ? 'bg-white text-gray-900 shadow-sm font-medium' 
                      : 'text-gray-600'
                  }`}
                >
                  <CalendarIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('week')}
                  className={`px-2 py-1 text-xs rounded-md transition-colors hidden sm:flex items-center ${
                    viewMode === 'week' 
                      ? 'bg-white text-gray-900 shadow-sm font-medium' 
                      : 'text-gray-600'
                  }`}
                >
                  <span className="text-xs">T</span>
                </button>
              </div>
              
              {/* Navigation */}
              <div className="flex items-center">
                <button
                  onClick={previousPeriod}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
                >
                  <ChevronLeftIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={nextPeriod}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
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
          className="pb-2"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {viewMode === 'list' ? renderListView() : 
           viewMode === 'week' ? renderWeekView() : 
           renderMonthView()}
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
                        <span className="text-gray-600">Tréner</span>
                        <span className="font-medium text-gray-900">{selectedSession.trainer.name}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600">Cena</span>
                        <span className="font-medium text-gray-900 text-lg">{selectedSession.price}€</span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-gray-600">Voľné miesta</span>
                        <span className="font-medium text-gray-900">
                          {selectedSession.available_spots || 0}/{selectedSession.capacity}
                        </span>
                      </div>
                    </div>
                  </div>

                  {selectedSession.description && (
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-3">Popis tréningy</h4>
                      <p className="text-gray-600 leading-relaxed">{selectedSession.description}</p>
                    </div>
                  )}

                  <div className="pt-4">
                    {isUserSignedUp(selectedSession) ? (
                      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-green-800 font-medium">Už ste prihlásený na tento tréning</span>
                        </div>
                      </div>
                    ) : isSessionFull(selectedSession) ? (
                      <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          <span className="text-red-800 font-medium">Tréning je plne obsadený</span>
                        </div>
                      </div>
                    ) : dogs.length === 0 ? (
                      <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                          <span className="text-amber-800 font-medium">Najprv si pridajte svojho psa</span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Vyberte psa pre tréning
                          </label>
                          <select
                            value={selectedDogId}
                            onChange={(e) => setSelectedDogId(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            rows={3}
                            placeholder="Dodatočné informácie pre trénera..."
                          />
                        </div>

                        <button
                          onClick={handleBookSession}
                          disabled={isBooking || !selectedDogId}
                          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation"
                        >
                          {isBooking ? 'Prihlasuje sa...' : 'Prihlásiť sa na tréning'}
                        </button>
                      </div>
                    )}
                  </div>
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