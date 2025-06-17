import { useState, useEffect, useRef } from 'react';
import { apiRequest, serviceTemplateApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { ChevronLeftIcon, ChevronRightIcon, XMarkIcon, PlusIcon, CalendarIcon, ListBulletIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import SessionForm from './SessionForm';

interface Session {
  id: string;
  title: string;
  description?: string;
  location: string;
  start_time: string;
  end_time: string;
  capacity: number;
  price: number;
  session_type: 'individual' | 'group' | 'daycare';
  status: string;
  waitlist_enabled: boolean;
  signups?: any[];
}

interface ServiceTemplate {
  id: number;
  name: string;
  color: string;
  duration: number;
  price: number;
  description?: string;
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
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [serviceTemplates, setServiceTemplates] = useState<ServiceTemplate[]>([]);
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
      fetchServiceTemplates();
    }
  }, [currentDate, token]);

  const fetchServiceTemplates = async () => {
    if (!token) return;
    
    try {
      const response = await serviceTemplateApi.list(token);
      if (response.success) {
        setServiceTemplates(response.data);
      }
    } catch (error) {
      console.error('Error fetching service templates:', error);
    }
  };

  const fetchSessions = async () => {
    if (!token) return;

    try {
      setLoading(true);
      // Add cache busting parameter to ensure fresh data
      const response = await apiRequest(`/sessions?_t=${Date.now()}`, { token });

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
    setSelectedSession(null);
    fetchSessions(); // Refresh sessions after creating/updating
  };

  const handleEditSession = (session: Session) => {
    setSelectedSession(session);
    setShowSessionForm(true);
    setShowSessionModal(false);
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!window.confirm('Ste si istí, že chcete zmazať tento tréning?')) {
      return;
    }

    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      setShowSessionModal(false);
      setSelectedSession(null);
      fetchSessions();
      alert('Tréning bol úspešne zmazaný');
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Chyba pri mazaní tréningu');
    }
  };

  const getSessionsForDate = (date: Date) => {
    // Use local date format to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    return sessions.filter(session => {
      const sessionDate = new Date(session.start_time);
      const sessionYear = sessionDate.getFullYear();
      const sessionMonth = String(sessionDate.getMonth() + 1).padStart(2, '0');
      const sessionDay = String(sessionDate.getDate()).padStart(2, '0');
      const sessionDateStr = `${sessionYear}-${sessionMonth}-${sessionDay}`;
      
      return sessionDateStr === dateStr;
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

  const getSessionColor = (session: Session) => {
    if (session.status === 'cancelled') return 'bg-red-500';
    if (session.status === 'completed') return 'bg-gray-400';
    
    // Debug logging
    console.log('Session:', session.title, 'Templates available:', serviceTemplates.length);
    if (serviceTemplates.length > 0) {
      console.log('Templates:', serviceTemplates.map(t => t.name));
    }
    
    // Try to find matching service template by title
    const template = serviceTemplates.find(t => t.name === session.title);
    if (template) {
      console.log('Found template for', session.title, '- color:', template.color);
      
      // Convert simple color name to Tailwind class
      const colorMap: { [key: string]: string } = {
        'red': 'bg-red-500',
        'orange': 'bg-orange-500',
        'amber': 'bg-amber-500',
        'yellow': 'bg-yellow-500',
        'lime': 'bg-lime-500',
        'green': 'bg-green-500',
        'emerald': 'bg-emerald-500',
        'teal': 'bg-teal-500',
        'cyan': 'bg-cyan-500',
        'sky': 'bg-sky-500',
        'blue': 'bg-blue-500',
        'indigo': 'bg-indigo-500',
        'violet': 'bg-violet-500',
        'purple': 'bg-purple-500',
        'fuchsia': 'bg-fuchsia-500',
        'pink': 'bg-pink-500',
        'rose': 'bg-rose-500',
        'gray': 'bg-gray-500',
        'slate': 'bg-slate-500',
        'zinc': 'bg-zinc-500',
        'neutral': 'bg-neutral-500',
        'stone': 'bg-stone-500'
      };
      
      const tailwindColor = colorMap[template.color] || 'bg-gray-500';
      console.log('Converted color:', template.color, '->', tailwindColor);
      return tailwindColor;
    } else {
      console.log('No template found for', session.title);
    }
    
    // Fallback to type-based colors
    switch (session.session_type) {
      case 'individual':
        return 'bg-blue-500';
      case 'group':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getSessionColorVariants = (session: Session) => {
    const baseColor = getSessionColor(session);
    
    // Extract color name (e.g., 'blue' from 'bg-blue-500')
    const colorMatch = baseColor.match(/bg-(\w+)-\d+/);
    const colorName = colorMatch ? colorMatch[1] : 'gray';
    
    return {
      solid: baseColor,
      light: `bg-${colorName}-50`,
      border: `border-${colorName}-200`,
      hover: `hover:bg-${colorName}-100`,
      text: `text-${colorName}-700`
    };
  };

  const getSessionLabel = (session: Session) => {
    // Try to find matching service template by title
    const template = serviceTemplates.find(t => t.name === session.title);
    if (template) {
      return template.name;
    }
    
    // Fallback to session title
    return session.title;
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
      return 'Tréningy';
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
        {/* Action button */}
        <div className="flex justify-end px-1 mb-4">
          <button
            onClick={() => handleCreateSessionClick(new Date())}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <PlusIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Nový tréning</span>
            <span className="sm:hidden">Nový</span>
          </button>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block">
          {/* Table header */}
          <div className="bg-gray-50 rounded-lg p-3 mb-2">
            <div className="grid grid-cols-12 gap-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
              <div className="col-span-3">Služba</div>
              <div className="col-span-2">Dátum</div>
              <div className="col-span-2">Čas</div>
              <div className="col-span-2">Lokácia</div>
              <div className="col-span-1">Účastníci</div>
              <div className="col-span-1">Cena</div>
              <div className="col-span-1">Akcie</div>
            </div>
          </div>

          {/* Table rows */}
          <div className="space-y-1">
            {upcomingSessions.map((session) => (
              <div
                key={session.id}
                onClick={() => handleSessionClick(session)}
                className="bg-white rounded-lg border border-gray-200 transition-all duration-200 cursor-pointer hover:shadow-md hover:bg-gray-50 active:scale-[0.99]"
              >
                <div className="grid grid-cols-12 gap-3 p-3 items-center">
                  {/* Service */}
                  <div className="col-span-3 flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${getSessionColor(session)} flex-shrink-0`}></div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate text-gray-900">
                        {getSessionLabel(session)}
                      </div>
                      <div className={`text-xs px-1.5 py-0.5 rounded-full inline-block ${
                        session.status === 'scheduled' ? 'bg-green-100 text-green-700' :
                        session.status === 'completed' ? 'bg-gray-100 text-gray-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {getStatusLabel(session.status)}
                      </div>
                    </div>
                  </div>
                  
                  {/* Date */}
                  <div className="col-span-2">
                    <div className="text-sm font-medium text-gray-900">
                      {formatRelativeDate(session.start_time)}
                    </div>
                  </div>
                  
                  {/* Time */}
                  <div className="col-span-2">
                    <div className="text-sm text-gray-600">
                      {formatTime(session.start_time)} - {formatTime(session.end_time)}
                    </div>
                  </div>
                  
                  {/* Location */}
                  <div className="col-span-2">
                    <div className="text-sm text-gray-600 truncate">
                      {session.location}
                    </div>
                  </div>
                  
                  {/* Participants */}
                  <div className="col-span-1">
                    <div className="text-sm text-gray-600">
                      {session.signups?.length || 0}/{session.capacity}
                    </div>
                    {session.capacity > 0 && (
                       <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                         <div 
                           className="h-1 rounded-full bg-blue-500"
                           style={{ width: `${Math.min(((session.signups?.length || 0) / session.capacity) * 100, 100)}%` }}
                         ></div>
                       </div>
                     )}
                  </div>
                  
                  {/* Price */}
                  <div className="col-span-1">
                    <div className="text-sm font-semibold text-gray-900">
                      {session.price}€
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="col-span-1">
                    <div className="flex space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditSession(session);
                        }}
                        className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Upraviť"
                      >
                        <PencilIcon className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSession(session.id);
                        }}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Zmazať"
                      >
                        <TrashIcon className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-3">
          {upcomingSessions.map((session) => (
            <div
              key={session.id}
              onClick={() => handleSessionClick(session)}
              className="bg-white rounded-lg border border-gray-200 p-4 transition-all duration-200 cursor-pointer hover:shadow-md active:scale-[0.98]"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${getSessionColor(session)} flex-shrink-0`}></div>
                  <div className="font-medium text-gray-900">
                    {getSessionLabel(session)}
                  </div>
                  <div className={`text-xs px-2 py-0.5 rounded-full ${
                    session.status === 'scheduled' ? 'bg-green-100 text-green-700' :
                    session.status === 'completed' ? 'bg-gray-100 text-gray-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {getStatusLabel(session.status)}
                  </div>
                </div>
                <div className="text-lg font-semibold text-gray-900">
                  {session.price}€
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Dátum:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatRelativeDate(session.start_time)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Čas:</span>
                  <span className="text-sm text-gray-900">
                    {formatTime(session.start_time)} - {formatTime(session.end_time)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Lokácia:</span>
                  <span className="text-sm text-gray-900">{session.location}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Účastníci:</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-900">
                      {session.signups?.length || 0}/{session.capacity}
                    </span>
                    {session.capacity > 0 && (
                      <div className="w-16 bg-gray-200 rounded-full h-1">
                        <div 
                          className="h-1 rounded-full bg-blue-500"
                          style={{ width: `${Math.min(((session.signups?.length || 0) / session.capacity) * 100, 100)}%` }}
                        ></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 mt-3 pt-3 border-t border-gray-100">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditSession(session);
                  }}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Upraviť"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteSession(session.id);
                  }}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Zmazať"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
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
                          className="p-3 rounded-lg cursor-pointer transition-all active:scale-[0.98] bg-gray-100 border border-gray-200"
                                                  >
                            <div className="flex items-center space-x-2 mb-2">
                              <div className={`w-2 h-2 rounded-full ${getSessionColor(session)}`}></div>
                              <div className="font-medium text-sm text-gray-900">{getSessionLabel(session)}</div>
                            </div>
                            <div className="text-xs text-gray-600">
                              {formatTime(session.start_time)} - {formatTime(session.end_time)}
                            </div>
                            <div className="text-xs text-gray-600">{session.location}</div>
                            {session.signups && (
                              <div className="text-xs text-gray-600 mt-1">
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
              // Always show all sessions for the day
              const visibleSessions = daySessions;

              return (
                <div
                  key={index}
                  className={`
                    min-h-[300px] lg:min-h-[400px] p-2 lg:p-3 rounded-lg border transition-all relative group
                    ${isTodayDay ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-100'}
                  `}
                >
                  {/* Create session button for desktop week view */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button
                      onClick={() => handleCreateSessionClick(day)}
                      className="p-1.5 rounded-full bg-blue-500 text-white hover:bg-blue-600 hover:scale-110 transform transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      title="Vytvoriť nový tréning"
                    >
                      <PlusIcon className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="space-y-1">
                    {visibleSessions.map((session) => (
                      <button
                        key={session.id}
                        onClick={() => handleSessionClick(session)}
                        className="w-full text-left p-2 rounded-md transition-all hover:scale-[1.02] cursor-pointer border border-gray-200 bg-gray-50 hover:bg-gray-100"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-2 flex-1 min-w-0">
                            <div className={`w-2 h-2 rounded-full ${getSessionColor(session)} flex-shrink-0 mt-1`}></div>
                            <div className="flex-1 min-w-0">
                                                          <div className="text-xs font-medium text-gray-900 truncate pr-2">
                              {getSessionLabel(session)}
                            </div>
                              <div className="text-xs text-gray-600 mt-0.5">
                                {session.signups?.length || 0}/{session.capacity} účastníkov
                              </div>
                            </div>
                          </div>
                          <div className="text-xs font-medium text-gray-700 flex-shrink-0">
                            {formatTime(session.start_time)}
                          </div>
                        </div>
                      </button>
                    ))}
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
                  if (!isCurrentMonthDay) return;
                  setSelectedDate(date);
                }}
                className={`
                  h-12 sm:h-16 lg:h-20 relative flex flex-col items-center justify-center group
                  border-r border-b border-gray-100 last:border-r-0
                  transition-all duration-200 hover:bg-gray-50 active:bg-gray-100
                  ${!isCurrentMonthDay ? 'opacity-30' : ''}
                  ${isTodayDay ? 'bg-blue-50' : ''}
                  ${isSelected ? 'bg-blue-100 ring-2 ring-blue-500 ring-inset' : ''}
                  cursor-pointer
                `}
                disabled={!isCurrentMonthDay}
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
                      const color = getSessionColor(session);
                      
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

                {/* Plus Icon for Creating New Session - show on all devices */}
                {isCurrentMonthDay && (
                  <div className="absolute top-1 sm:top-2 right-1 sm:right-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCreateSessionClick(date);
                      }}
                      className="
                        p-1 rounded-full bg-blue-500 text-white
                        hover:bg-blue-600 hover:scale-110 transform
                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                        cursor-pointer
                      "
                      title="Vytvoriť nový tréning"
                    >
                      <PlusIcon className="h-3 sm:h-4 w-3 sm:w-4" />
                    </div>
                  </div>
                )}

                {/* Desktop hover preview */}
                {daySessions.length > 0 && window.innerWidth >= 640 && (
                  <div className="hidden group-hover:block absolute top-full left-0 z-20 mt-1 w-48 p-2 bg-white rounded-lg shadow-lg border border-gray-200">
                    {daySessions.slice(0, 3).map((session) => (
                      <div key={session.id} className="text-xs text-left p-1">
                        <div className="font-medium text-gray-900 truncate">{session.title}</div>
                        <div className="text-gray-500">{formatTime(session.start_time)}</div>
                        <div className="text-gray-400">{getStatusLabel(session.status)}</div>
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

        {/* Selected date sessions list (always visible if selectedDate) */}
        {selectedDate && (
          <div className="bg-white border-t border-gray-100">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">
                  {selectedDate.toLocaleDateString('sk-SK', { 
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long'
                  })}
                </h3>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Create session button */}
            <div className="px-4 py-3 border-b border-gray-100">
              <button
                onClick={() => handleCreateSessionClick(selectedDate)}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 active:bg-blue-700 transition-colors"
              >
                <PlusIcon className="h-5 w-5" />
                <span className="font-medium">Vytvoriť tréning</span>
              </button>
            </div>

            {/* Sessions list */}
            {selectedDateSessions.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {selectedDateSessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => handleSessionClick(session)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="text-sm font-medium text-gray-900">
                          {formatTime(session.start_time)}
                        </div>
                        <div className="text-sm text-gray-900">
                          {session.title}
                        </div>
                      </div>
                      <div className={`w-2 h-2 rounded-full ${getSessionColor(session)}`} />
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-4 py-6 text-center text-gray-500">
                <CalendarIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm">Žiadne tréningy</p>
              </div>
            )}
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
                          <div className="text-xs text-blue-700">
                            {session.signups?.length || 0}/{session.capacity}
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
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
      {/* Header */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg mb-4">
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
                    <div className="flex items-center space-x-3 mb-2">
                      <div className={`w-3 h-3 rounded-full ${getSessionColor(selectedSession)}`}></div>
                      <h3 className="text-xl sm:text-2xl font-semibold text-gray-900">
                        {getSessionLabel(selectedSession)}
                      </h3>
                    </div>
                    <div className="flex items-center space-x-2">
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
                        <span className="text-gray-600">Služba</span>
                        <span className="font-medium text-gray-900">
                          {getSessionLabel(selectedSession)}
                        </span>
                      </div>
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

                  {/* Action Buttons */}
                  <div className="border-t border-gray-200 pt-6">
                    <div className="flex space-x-3">
                      <button
                        onClick={() => handleEditSession(selectedSession)}
                        className="flex-1 flex items-center justify-center px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 active:bg-blue-700 transition-colors touch-manipulation"
                      >
                        <PencilIcon className="h-5 w-5 mr-2" />
                        Upraviť
                      </button>
                      <button
                        onClick={() => handleDeleteSession(selectedSession.id)}
                        className="flex-1 flex items-center justify-center px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 active:bg-red-700 transition-colors touch-manipulation"
                      >
                        <TrashIcon className="h-5 w-5 mr-2" />
                        Zmazať
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Session Form Modal */}
      {showSessionForm && (
        <SessionForm
          session={selectedSession}
          date={selectedDate}
          onClose={handleSessionFormClose}
          onSuccess={handleSessionFormSuccess}
        />
      )}
    </div>
  );
};

export default TrainerCalendar; 