import { useState, useEffect, useRef } from 'react';
import { apiRequest } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { ChevronLeftIcon, ChevronRightIcon, XMarkIcon, PlusIcon, CalendarIcon, ListBulletIcon } from '@heroicons/react/24/outline';
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

type ViewMode = 'list' | 'month' | 'week';

const TrainerCalendar = () => {
  const { token } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchEndX, setTouchEndX] = useState(0);
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
          <button
            onClick={() => handleCreateSessionClick(new Date())}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            Vytvoriť nový tréning
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Vaše tréningy</h2>
          <button
            onClick={() => handleCreateSessionClick(new Date())}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <PlusIcon className="h-4 w-4" />
            <span>Nový</span>
          </button>
        </div>

        {upcomingSessions.map((session) => (
          <div
            key={session.id}
            onClick={() => handleSessionClick(session)}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 active:scale-[0.98] transition-transform cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <div className={`w-3 h-3 rounded-full ${getSessionTypeColor(session.session_type, session.status)}`}></div>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {getSessionTypeLabel(session.session_type)}
                  </span>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs text-gray-500">
                    {getStatusLabel(session.status)}
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
                    <span>👥 {session.signups?.length || 0}/{session.capacity} prihlásených</span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col items-end space-y-2">
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900">
                    {session.price}€
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
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-sm font-medium text-gray-700">
                        {weekDayNames[index]}, {day.getDate()}. {monthNames[day.getMonth()]}
                      </h3>
                      <button
                        onClick={() => handleCreateSessionClick(day)}
                        className="p-1 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                      >
                        <PlusIcon className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="space-y-2">
                      {daySessions.map((session) => (
                        <div
                          key={session.id}
                          onClick={() => handleSessionClick(session)}
                          className={`p-3 rounded-lg cursor-pointer transition-all active:scale-[0.98] ${getSessionTypeColor(session.session_type, session.status)} text-white`}
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
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {daySessions.length === 0 && (
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-sm font-medium text-gray-700">
                        {weekDayNames[index]}, {day.getDate()}. {monthNames[day.getMonth()]}
                      </h3>
                      <button
                        onClick={() => handleCreateSessionClick(day)}
                        className="p-1 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                      >
                        <PlusIcon className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="text-sm text-gray-500 italic">Žiadne tréningy</div>
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
                    relative min-h-[300px] lg:min-h-[400px] p-2 lg:p-3 rounded-lg border transition-all
                    hover:border-gray-200 hover:shadow-sm group
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
                          ${getSessionTypeColor(session.session_type, session.status)} text-white
                        `}
                      >
                        <div className="font-medium text-xs lg:text-sm">{session.title}</div>
                        <div className="text-xs opacity-90">
                          {formatTime(session.start_time)} - {formatTime(session.end_time)}
                        </div>
                        <div className="text-xs opacity-75 truncate">{session.location}</div>
                        {session.signups && (
                          <div className="text-xs opacity-90 mt-1">
                            {session.signups.length}/{session.capacity}
                          </div>
                        )}
                      </button>
                    ))}
                    {daySessions.length > 4 && (
                      <div className="text-xs text-gray-500 p-2 text-center bg-gray-50 rounded-lg">
                        +{daySessions.length - 4} ďalších
                      </div>
                    )}
                  </div>

                  {/* Plus Icon for Creating New Session */}
                  <button
                    onClick={() => handleCreateSessionClick(day)}
                    className="
                      absolute top-2 lg:top-3 right-2 lg:right-3 p-1 lg:p-2 rounded-full bg-blue-500 text-white
                      opacity-0 group-hover:opacity-100 transition-all duration-200
                      hover:bg-blue-600 hover:scale-110 transform
                      focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                    "
                    title="Vytvoriť nový tréning"
                  >
                    <PlusIcon className="h-4 lg:h-5 w-4 lg:w-5" />
                  </button>
                </div>
              );
            })}
          </div>
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
                  relative min-h-[80px] sm:min-h-[100px] p-1 sm:p-2 border border-gray-50 rounded-lg transition-all 
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
                  {daySessions.slice(0, window.innerWidth < 640 ? 2 : 3).map((session) => (
                    <button
                      key={session.id}
                      onClick={() => handleSessionClick(session)}
                      className={`
                        w-full text-left px-1 sm:px-2 py-1 rounded-md text-xs font-medium
                        transition-all hover:scale-105 cursor-pointer
                        ${getSessionTypeColor(session.session_type, session.status)} text-white
                      `}
                    >
                      <div className="truncate">{session.title}</div>
                      <div className="text-xs opacity-90 hidden sm:block">
                        {formatTime(session.start_time)}
                      </div>
                    </button>
                  ))}
                  {daySessions.length > (window.innerWidth < 640 ? 2 : 3) && (
                    <div className="text-xs text-gray-500 px-1 sm:px-2">
                      +{daySessions.length - (window.innerWidth < 640 ? 2 : 3)} viac
                    </div>
                  )}
                </div>

                {/* Plus Icon for Creating New Session */}
                {isCurrentMonthDay && (
                  <button
                    onClick={() => handleCreateSessionClick(date)}
                    className="
                      absolute top-1 sm:top-2 right-1 sm:right-2 p-1 rounded-full bg-blue-500 text-white
                      opacity-0 group-hover:opacity-100 transition-all duration-200
                      hover:bg-blue-600 hover:scale-110 transform
                      focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                    "
                    title="Vytvoriť nový tréning"
                  >
                    <PlusIcon className="h-3 sm:h-4 w-3 sm:w-4" />
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
                    <div className="flex items-center space-x-2">
                      <span className={`
                        inline-block px-3 py-1 rounded-full text-sm font-medium
                        ${selectedSession.session_type === 'individual' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'}
                      `}>
                        {getSessionTypeLabel(selectedSession.session_type)}
                      </span>
                      <span className={`
                        inline-block px-3 py-1 rounded-full text-sm font-medium
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
                        <span className="text-gray-600">Kapacita</span>
                        <span className="font-medium text-gray-900">
                          {selectedSession.capacity} miest
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-gray-600">Prihlásení</span>
                        <span className="font-medium text-gray-900">
                          {selectedSession.signups?.length || 0}/{selectedSession.capacity}
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

                  {selectedSession.signups && selectedSession.signups.length > 0 && (
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-3">
                        Prihlásení účastníci ({selectedSession.signups.length})
                      </h4>
                      <div className="space-y-2">
                        {selectedSession.signups.map((signup: any, index: number) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <div className="font-medium text-gray-900">
                                {signup.dog?.name || 'Neznámy pes'}
                              </div>
                              <div className="text-sm text-gray-600">
                                {signup.user?.name || 'Neznámy majiteľ'}
                              </div>
                            </div>
                            <span className={`
                              px-2 py-1 rounded-full text-xs font-medium
                              ${signup.status === 'approved' ? 'bg-green-100 text-green-800' :
                                signup.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                                'bg-red-100 text-red-800'}
                            `}>
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
        </div>
      )}

      {/* Session Form Modal */}
      {showSessionForm && (
        <SessionForm
          selectedDate={selectedDate}
          onClose={handleSessionFormClose}
          onSuccess={handleSessionFormSuccess}
        />
      )}
    </div>
  );
};

export default TrainerCalendar; 