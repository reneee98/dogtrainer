import { useQuery } from '@tanstack/react-query';
import { 
  CalendarDaysIcon, 
  UsersIcon, 
  StarIcon, 
  ClockIcon,
  CheckCircleIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { sessionApi, bookingApi, reviewApi } from '../lib/api';
import { format, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { sk } from 'date-fns/locale';
import ClientRequestsManagement from './ClientRequestsManagement';

export default function TrainerDashboard() {
  const { token, user } = useAuth();

  const { data: sessions, error: sessionsError, isLoading: sessionsLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => sessionApi.list(token!),
    enabled: !!token && user?.role === 'trainer',
  });

  const { data: bookings, error: bookingsError, isLoading: bookingsLoading } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => bookingApi.list(token!),
    enabled: !!token && user?.role === 'trainer',
  });

  const { data: reviewStats } = useQuery({
    queryKey: ['review-stats', user?.id],
    queryFn: () => reviewApi.trainerStats(token!, user!.id),
    enabled: !!token && user?.role === 'trainer' && !!user?.id,
  });

  if (user?.role !== 'trainer') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <UsersIcon className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Prístup zamietnutý</h3>
          <p className="text-gray-500">Táto stránka je dostupná len pre trénerov</p>
        </div>
      </div>
    );
  }

  // Show loading state
  if (sessionsLoading || bookingsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-96 mb-8"></div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-sm p-6">
                  <div className="h-20 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-sm p-6">
                  <div className="h-64 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (sessionsError || bookingsError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <ChartBarIcon className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Chyba pri načítavaní</h3>
          <div className="text-gray-500 space-y-1">
            {sessionsError && <p>Relácie: {sessionsError.message}</p>}
            {bookingsError && <p>Rezervácie: {bookingsError.message}</p>}
          </div>
        </div>
      </div>
    );
  }

  // Calculate this week's statistics
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  // Safely process data with multiple validation levels
  let sessionsList: any[] = [];
  let bookingsList: any[] = [];

  // Validate sessions data
  try {
    if (Array.isArray(sessions)) {
      sessionsList = sessions;
    } else if (sessions && typeof sessions === 'object') {
      if (Array.isArray(sessions.data)) {
        sessionsList = sessions.data;
      } else {
        // Search for any array property
        for (const key in sessions) {
          if (Array.isArray(sessions[key])) {
            sessionsList = sessions[key];
            break;
          }
        }
      }
    }
  } catch (e) {
    sessionsList = [];
  }

  // Validate bookings data
  try {
    if (Array.isArray(bookings)) {
      bookingsList = bookings;
    } else if (bookings && typeof bookings === 'object') {
      if (Array.isArray(bookings.data)) {
        bookingsList = bookings.data;
      } else {
        // Search for any array property
        for (const key in bookings) {
          if (Array.isArray(bookings[key])) {
            bookingsList = bookings[key];
            break;
          }
        }
      }
    }
  } catch (e) {
    bookingsList = [];
  }

  // Final safety check
  if (!Array.isArray(sessionsList)) {
    sessionsList = [];
  }
  if (!Array.isArray(bookingsList)) {
    bookingsList = [];
  }

  const thisWeekSessions = Array.isArray(sessionsList) ? sessionsList.filter((session: any) => {
    try {
      return session?.start_time && isWithinInterval(new Date(session.start_time), { start: weekStart, end: weekEnd });
    } catch (error) {
      return false;
    }
  }) : [];

  const thisWeekBookings = Array.isArray(bookingsList) ? bookingsList.filter((booking: any) => {
    try {
      return booking?.start_time && isWithinInterval(new Date(booking.start_time), { start: weekStart, end: weekEnd });
    } catch (error) {
      return false;
    }
  }) : [];

  const pendingBookings = Array.isArray(bookingsList) ? bookingsList.filter((booking: any) => 
    booking?.status === 'pending'
  ) : [];

  const upcomingSessions = Array.isArray(sessionsList) ? sessionsList.filter((session: any) => {
    try {
      return session?.start_time && 
             new Date(session.start_time) > now && 
             session?.status === 'active';
    } catch (error) {
      return false;
    }
  }).slice(0, 5) : [];

  const stats = [
    {
      name: 'Relácie tento týždeň',
      value: thisWeekSessions.length,
      icon: CalendarDaysIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      iconBg: 'bg-blue-100',
    },
    {
      name: 'Rezervácie tento týždeň',
      value: thisWeekBookings.length,
      icon: ClockIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      iconBg: 'bg-green-100',
    },
    {
      name: 'Čakajúce potvrdenie',
      value: pendingBookings.length,
      icon: UsersIcon,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      iconBg: 'bg-yellow-100',
    },
    {
      name: 'Priemerné hodnotenie',
      value: reviewStats?.average_rating ? `${reviewStats.average_rating.toFixed(1)}/5` : 'N/A',
      icon: StarIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      iconBg: 'bg-purple-100',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Vitajte späť, {user?.name}!
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            Tu je prehľad vašej aktivity a nadchádzajúcich relácií
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => (
            <div key={stat.name} className={`${stat.bgColor} rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow`}>
              <div className="flex items-center">
                <div className={`flex-shrink-0 p-3 rounded-lg ${stat.iconBg}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div className="ml-4 flex-1">
                  <div className="text-sm font-medium text-gray-600">{stat.name}</div>
                  <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upcoming Sessions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <CalendarDaysIcon className="h-5 w-5 text-blue-600 mr-2" />
                Nadchádzajúce relácie
              </h3>
            </div>
            <div className="p-6">
              {upcomingSessions.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarDaysIcon className="mx-auto h-12 w-12 text-gray-300" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Žiadne nadchádzajúce relácie</h3>
                  <p className="mt-1 text-sm text-gray-500">Vytvorte nové relácie pre vašich klientov.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingSessions.map((session: any) => (
                    <div key={session.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{session.name || 'Relácia'}</div>
                        <div className="text-sm text-gray-600 mt-1 flex items-center">
                          <ClockIcon className="h-4 w-4 mr-1" />
                          {session.start_time ? format(new Date(session.start_time), 'dd.MM.yyyy HH:mm', { locale: sk }) : 'Čas neurčený'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {session.current_signups || 0}/{session.capacity || 0}
                        </div>
                        <div className="text-xs text-gray-500">účastníkov</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Pending Bookings */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <CheckCircleIcon className="h-5 w-5 text-yellow-600 mr-2" />
                Čakajúce rezervácie
              </h3>
            </div>
            <div className="p-6">
              {pendingBookings.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircleIcon className="mx-auto h-12 w-12 text-gray-300" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Žiadne čakajúce rezervácie</h3>
                  <p className="mt-1 text-sm text-gray-500">Všetky rezervácie sú spracované.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingBookings.slice(0, 5).map((booking: any) => (
                    <div key={booking.id} className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{booking.service_type || 'Služba'}</div>
                        <div className="text-sm text-gray-600 mt-1">
                          {booking.dog?.name || 'Neznámy pes'} • {booking.start_time ? format(new Date(booking.start_time), 'dd.MM.yyyy HH:mm', { locale: sk }) : 'Čas neurčený'}
                        </div>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <button className="px-3 py-1 text-xs font-medium bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">
                          Potvrdiť
                        </button>
                        <button className="px-3 py-1 text-xs font-medium bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors">
                          Odmietnuť
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Reviews */}
        {reviewStats?.reviews && reviewStats.reviews.length > 0 && (
          <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <StarIcon className="h-5 w-5 text-purple-600 mr-2" />
                Najnovšie recenzie
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                {reviewStats.reviews.slice(0, 3).map((review: any) => (
                  <div key={review.id} className="border-l-4 border-purple-200 pl-4 py-2">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <StarIcon
                              key={i}
                              className={`h-4 w-4 ${
                                i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {review.rating}/5
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {format(new Date(review.created_at), 'dd.MM.yyyy', { locale: sk })}
                      </span>
                    </div>
                    <p className="text-gray-700 mb-2 leading-relaxed">{review.comment}</p>
                    <p className="text-xs text-gray-500">
                      Od majiteľa psa {review.dog?.name}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Client Requests Management */}
        <div className="mt-8">
          <ClientRequestsManagement />
        </div>
      </div>
    </div>
  );
} 