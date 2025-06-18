import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { 
  CalendarDaysIcon, 
  UsersIcon, 
  StarIcon, 
  ClockIcon,
  CheckCircleIcon,
  ChartBarIcon,
  PlayIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { sessionApi, bookingApi, reviewApi } from '../lib/api';
import { format, startOfWeek, endOfWeek, isWithinInterval, differenceInMinutes, differenceInSeconds } from 'date-fns';
import { sk } from 'date-fns/locale';
import ClientRequestsManagement from './ClientRequestsManagement';
import PendingApprovalsCompact from './PendingApprovalsCompact';

interface TrainerDashboardProps {
  setActiveSection?: (section: string) => void;
}

export default function TrainerDashboard({ setActiveSection }: TrainerDashboardProps = {}) {
  const { token, user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second for countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

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

  // Removed pendingBookings as we no longer show pending bookings

  // Get sessions with approved signups for "Najbližší tréning" - updated logic
  const getSessionsWithCountdown = () => {
    if (!Array.isArray(sessionsList)) return [];

    return sessionsList
      .filter((session: any) => {
        try {
          if (!session?.start_time || !session?.end_time) return false;
          
          const startTime = new Date(session.start_time);
          const endTime = new Date(session.end_time);
          
          // Show if session hasn't ended yet
          const isNotFinished = endTime > currentTime;
          if (!isNotFinished) return false;
          
          // Check if session has approved signups
          const hasApprovedSignups = session?.signups && 
            Array.isArray(session.signups) && 
            session.signups.some((signup: any) => signup.status === 'approved');
          
          return hasApprovedSignups;
        } catch (error) {
          return false;
        }
      })
      .sort((a: any, b: any) => {
        // Sort by start time (earliest first)
        return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
      })
      .slice(0, 3) // Limit to 3 sessions
      .map((session: any) => {
        const startTime = new Date(session.start_time);
        const endTime = new Date(session.end_time);
        const isOngoing = currentTime >= startTime && currentTime <= endTime;
        const isUpcoming = currentTime < startTime;
        
        let countdownText = '';
        let countdownValue = 0;
        let status = '';
        
        if (isOngoing) {
          countdownValue = differenceInMinutes(endTime, currentTime);
          status = 'ongoing';
          if (countdownValue > 60) {
            const hours = Math.floor(countdownValue / 60);
            const minutes = countdownValue % 60;
            countdownText = `zostáva ${hours}h ${minutes}min`;
          } else if (countdownValue > 0) {
            countdownText = `zostáva ${countdownValue} min`;
          } else {
            const seconds = differenceInSeconds(endTime, currentTime);
            countdownText = seconds > 0 ? `zostáva ${seconds}s` : 'Končí';
          }
        } else if (isUpcoming) {
          countdownValue = differenceInMinutes(startTime, currentTime);
          status = 'upcoming';
          if (countdownValue > 60) {
            const hours = Math.floor(countdownValue / 60);
            const minutes = countdownValue % 60;
            countdownText = `za ${hours}h ${minutes}min`;
          } else if (countdownValue > 0) {
            countdownText = `za ${countdownValue} min`;
          } else {
            const seconds = differenceInSeconds(startTime, currentTime);
            countdownText = seconds > 0 ? `za ${seconds}s` : 'Začína';
          }
        }
        
        return {
          ...session,
          isOngoing,
          isUpcoming,
          countdownText,
          countdownValue,
          status
        };
      });
  };

  const approvedSessions = getSessionsWithCountdown();

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
          {/* Closest Training - Enhanced */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <CalendarDaysIcon className="h-5 w-5 text-blue-600 mr-2" />
                  Najbližší tréning
                </h3>
                {approvedSessions.length > 3 && setActiveSection && (
                  <button
                    onClick={() => setActiveSection('sessions')}
                    className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center transition-colors"
                  >
                    Zobraziť všetky
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            <div className="p-6">
              {approvedSessions.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarDaysIcon className="mx-auto h-12 w-12 text-gray-300" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Žiadny najbližší tréning</h3>
                  <p className="mt-1 text-sm text-gray-500">Vytvorte nové tréningy pre vašich klientov.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {approvedSessions.slice(0, 3).map((session: any) => (
                    <div 
                      key={session.id} 
                      className={`p-4 rounded-lg transition-all duration-300 ${
                        session.isOngoing 
                          ? 'bg-green-50 border-2 border-green-200 shadow-md' 
                          : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center">
                            <div className="font-medium text-gray-900">{session.title || 'Tréning'}</div>
                            {session.isOngoing && (
                              <div className="ml-2 flex items-center">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                <span className="ml-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-full">
                                  PREBIEHA
                                </span>
                              </div>
                            )}
                          </div>
                          
                          <div className="text-sm text-gray-600 mt-1 flex items-center">
                            <ClockIcon className="h-4 w-4 mr-1" />
                            {session.start_time ? format(new Date(session.start_time), 'dd.MM.yyyy HH:mm', { locale: sk }) : 'Čas neurčený'}
                          </div>
                          
                          {session.location && (
                            <div className="text-xs text-gray-500 mt-1">📍 {session.location}</div>
                          )}
                          
                          {/* Countdown */}
                          {session.countdownText && (
                            <div className={`text-sm font-medium mt-2 flex items-center ${
                              session.isOngoing ? 'text-green-700' : 'text-blue-700'
                            }`}>
                              {session.isOngoing ? (
                                <PlayIcon className="h-4 w-4 mr-1" />
                              ) : (
                                <ClockIcon className="h-4 w-4 mr-1" />
                              )}
                              {session.countdownText}
                            </div>
                          )}
                        </div>
                        
                        <div className="text-right ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {session.signups ? session.signups.filter((s: any) => s.status === 'approved').length : 0}/{session.capacity || 0}
                          </div>
                          <div className="text-xs text-gray-500">schválených</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Pending Approvals - Compact */}
          <div>
            <PendingApprovalsCompact />
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