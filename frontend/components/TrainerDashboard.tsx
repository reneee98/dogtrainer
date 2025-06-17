import { useQuery } from '@tanstack/react-query';
import { 
  CalendarDaysIcon, 
  UsersIcon, 
  StarIcon, 
  CurrencyEuroIcon,
  ClockIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { sessionApi, bookingApi, reviewApi } from '../lib/api';
import { format, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { sk } from 'date-fns/locale';

export default function TrainerDashboard() {
  const { token, user } = useAuth();

  const { data: sessions } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => sessionApi.list(token!),
    enabled: !!token && user?.role === 'trainer',
  });

  const { data: bookings } = useQuery({
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
      <div className="text-center text-gray-500 p-8">
        Táto stránka je dostupná len pre trénerov
      </div>
    );
  }

  // Calculate this week's statistics
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const thisWeekSessions = sessions?.filter((session: any) => 
    isWithinInterval(new Date(session.start_time), { start: weekStart, end: weekEnd })
  ) || [];

  const thisWeekBookings = bookings?.filter((booking: any) => 
    isWithinInterval(new Date(booking.start_time), { start: weekStart, end: weekEnd })
  ) || [];

  const pendingBookings = bookings?.filter((booking: any) => 
    booking.status === 'pending'
  ) || [];

  const upcomingSessions = sessions?.filter((session: any) => 
    new Date(session.start_time) > now && session.status === 'active'
  ).slice(0, 5) || [];

  const stats = [
    {
      name: 'Relácie tento týždeň',
      value: thisWeekSessions.length,
      icon: CalendarDaysIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      name: 'Rezervácie tento týždeň',
      value: thisWeekBookings.length,
      icon: ClockIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      name: 'Čakajúce potvrdenie',
      value: pendingBookings.length,
      icon: UsersIcon,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
    {
      name: 'Priemerné hodnotenie',
      value: reviewStats?.average_rating ? `${reviewStats.average_rating.toFixed(1)}/5` : 'N/A',
      icon: StarIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Vitajte späť, {user?.name}!
        </h1>
        <p className="text-gray-600">
          Tu je prehľad vašej aktivity
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="card">
            <div className="flex items-center">
              <div className={`flex-shrink-0 p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-500">{stat.name}</div>
                <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Sessions */}
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Nadchádzajúce relácie
          </h3>
          {upcomingSessions.length === 0 ? (
            <p className="text-gray-500">Žiadne nadchádzajúce relácie</p>
          ) : (
            <div className="space-y-3">
              {upcomingSessions.map((session: any) => (
                <div key={session.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">{session.name}</div>
                    <div className="text-sm text-gray-600">
                      {format(new Date(session.start_time), 'dd.MM.yyyy HH:mm', { locale: sk })}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {session.current_signups}/{session.capacity} účastníkov
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Bookings */}
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Čakajúce rezervácie
          </h3>
          {pendingBookings.length === 0 ? (
            <p className="text-gray-500">Žiadne čakajúce rezervácie</p>
          ) : (
            <div className="space-y-3">
              {pendingBookings.slice(0, 5).map((booking: any) => (
                <div key={booking.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">{booking.service_type}</div>
                    <div className="text-sm text-gray-600">
                      {booking.dog.name} • {format(new Date(booking.start_time), 'dd.MM.yyyy HH:mm', { locale: sk })}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button className="text-xs bg-green-600 text-white px-2 py-1 rounded">
                      Potvrdiť
                    </button>
                    <button className="text-xs bg-red-600 text-white px-2 py-1 rounded">
                      Odmietnuť
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Reviews */}
      {reviewStats?.reviews && reviewStats.reviews.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Najnovšie recenzie
          </h3>
          <div className="space-y-4">
            {reviewStats.reviews.slice(0, 3).map((review: any) => (
              <div key={review.id} className="border-l-4 border-primary-200 pl-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
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
                    <span className="ml-2 text-sm text-gray-600">
                      {format(new Date(review.created_at), 'dd.MM.yyyy', { locale: sk })}
                    </span>
                  </div>
                </div>
                <p className="text-gray-700 text-sm">{review.comment}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Od majiteľa psa {review.dog?.name}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 