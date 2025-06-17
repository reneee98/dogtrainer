import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { 
  FaDog, 
  FaCalendarAlt, 
  FaUsers, 
  FaCogs, 
  FaSignOutAlt, 
  FaChartLine,
  FaUserTie,
  FaPaw,
  FaBell,
  FaPlus
} from 'react-icons/fa';

interface DashboardStat {
  title: string;
  value: string;
  icon: JSX.Element;
  color: string;
}

export default function Dashboard() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState('overview');
  const [dashboardStats, setDashboardStats] = useState({
    dogs: 0,
    bookings: 0,
    sessions: 0,
    reviews: 4.9
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to auth
  }

  const handleLogout = () => {
    logout();
  };

  const ownerStats: DashboardStat[] = [
    {
      title: 'Moji psi',
      value: dashboardStats.dogs.toString(),
      icon: <FaDog className="text-2xl" />,
      color: 'bg-blue-500'
    },
    {
      title: 'Aktívne rezervácie',
      value: dashboardStats.bookings.toString(),
      icon: <FaCalendarAlt className="text-2xl" />,
      color: 'bg-green-500'
    },
    {
      title: 'Skupinové lekcie',
      value: dashboardStats.sessions.toString(),
      icon: <FaUsers className="text-2xl" />,
      color: 'bg-purple-500'
    },
    {
      title: 'Hodnotenie',
      value: dashboardStats.reviews.toString(),
      icon: <FaPaw className="text-2xl" />,
      color: 'bg-orange-500'
    }
  ];

  const trainerStats: DashboardStat[] = [
    {
      title: 'Moji klienti',
      value: '24',
      icon: <FaUsers className="text-2xl" />,
      color: 'bg-blue-500'
    },
    {
      title: 'Dnešné lekcie',
      value: '8',
      icon: <FaCalendarAlt className="text-2xl" />,
      color: 'bg-green-500'
    },
    {
      title: 'Hodnotenia',
      value: '4.9',
      icon: <FaChartLine className="text-2xl" />,
      color: 'bg-yellow-500'
    },
    {
      title: 'Tento mesiac',
      value: '145',
      icon: <FaUserTie className="text-2xl" />,
      color: 'bg-purple-500'
    }
  ];

  const stats = user.role === 'owner' ? ownerStats : trainerStats;

  const navigationItems = user.role === 'owner' 
    ? [
        { id: 'overview', label: 'Prehľad', icon: <FaChartLine /> },
        { id: 'dogs', label: 'Moji psi', icon: <FaDog /> },
        { id: 'bookings', label: 'Rezervácie', icon: <FaCalendarAlt /> },
        { id: 'sessions', label: 'Skupinové lekcie', icon: <FaUsers /> },
        { id: 'daycare', label: 'Denné pobyty', icon: <FaPaw /> },
        { id: 'notifications', label: 'Notifikácie', icon: <FaBell /> },
      ]
    : [
        { id: 'overview', label: 'Prehľad', icon: <FaChartLine /> },
        { id: 'schedule', label: 'Môj rozvrh', icon: <FaCalendarAlt /> },
        { id: 'clients', label: 'Klienti', icon: <FaUsers /> },
        { id: 'sessions', label: 'Lekcie', icon: <FaUserTie /> },
        { id: 'daycare', label: 'Denné pobyty', icon: <FaPaw /> },
        { id: 'reviews', label: 'Hodnotenia', icon: <FaChartLine /> },
      ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <FaDog className="h-8 w-8 text-indigo-600 mr-2" />
                <h1 className="text-xl font-bold text-gray-900">Dog Booking</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 bg-indigo-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">{user.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{user.role === 'owner' ? 'Majiteľ' : 'Tréner'}</p>
                </div>
              </div>
              
              <button
                onClick={handleLogout}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FaSignOutAlt className="mr-2" />
                Odhlásiť sa
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <nav className="w-64 bg-white shadow-sm h-screen sticky top-0">
          <div className="p-4">
            <ul className="space-y-2">
              {navigationItems.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                      activeSection === item.id
                        ? 'bg-indigo-50 text-indigo-700 border-r-2 border-indigo-500'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <span className="mr-3">{item.icon}</span>
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-8">
          {activeSection === 'overview' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Vitajte späť, {user.name}!
                </h2>
                <p className="text-gray-600">
                  Tu je prehľad vašej aktivity
                </p>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, index) => (
                  <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center">
                      <div className={`${stat.color} text-white p-3 rounded-lg mr-4`}>
                        {stat.icon}
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
                        <p className="text-gray-600 text-sm">{stat.title}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Rýchle akcie</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {user.role === 'owner' ? (
                    <>
                      <button className="flex items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                        <FaPlus className="text-blue-600 mr-3" />
                        <span className="text-blue-900 font-medium">Pridať psa</span>
                      </button>
                      <button className="flex items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                        <FaCalendarAlt className="text-green-600 mr-3" />
                        <span className="text-green-900 font-medium">Rezervovať lekciu</span>
                      </button>
                      <button className="flex items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
                        <FaUsers className="text-purple-600 mr-3" />
                        <span className="text-purple-900 font-medium">Skupinové lekcie</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="flex items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                        <FaPlus className="text-blue-600 mr-3" />
                        <span className="text-blue-900 font-medium">Vytvoriť lekciu</span>
                      </button>
                      <button className="flex items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                        <FaCalendarAlt className="text-green-600 mr-3" />
                        <span className="text-green-900 font-medium">Upraviť rozvrh</span>
                      </button>
                      <button className="flex items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
                        <FaUsers className="text-purple-600 mr-3" />
                        <span className="text-purple-900 font-medium">Spravovať klientov</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Dogs Management */}
          {activeSection === 'dogs' && user.role === 'owner' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Moji psi</h2>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="text-center py-8">
                  <FaDog className="mx-auto text-4xl text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Správa psov</h3>
                  <p className="text-gray-600 mb-4">Pridajte a spravujte svojich psov.</p>
                  <button
                    onClick={() => alert('Pridávanie psov bude čoskoro dostupné!')}
                    className="bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-3 rounded-lg flex items-center mx-auto"
                  >
                    <FaPlus className="mr-2" />
                    Pridať psa
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Bookings */}
          {activeSection === 'bookings' && user.role === 'owner' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Rezervácie</h2>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="text-center py-8">
                  <FaCalendarAlt className="mx-auto text-4xl text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Moje rezervácie</h3>
                  <p className="text-gray-600 mb-4">Zobrazte a spravujte svoje rezervácie tréningov.</p>
                  <button
                    onClick={() => alert('Rezervácie budú čoskoro dostupné!')}
                    className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg flex items-center mx-auto"
                  >
                    <FaCalendarAlt className="mr-2" />
                    Nová rezervácia
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Sessions */}
          {(activeSection === 'sessions' || activeSection === 'schedule') && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {user.role === 'owner' ? 'Skupinové lekcie' : 'Môj rozvrh'}
              </h2>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="text-center py-8">
                  <FaUsers className="mx-auto text-4xl text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {user.role === 'owner' ? 'Skupinové aktivity' : 'Rozvrh tréningov'}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {user.role === 'owner' 
                      ? 'Prihláste sa na skupinové lekcie a aktivity.'
                      : 'Spravujte svoj rozvrh a lekcie.'}
                  </p>
                  <button
                    onClick={() => alert('Lekcie budú čoskoro dostupné!')}
                    className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-lg flex items-center mx-auto"
                  >
                    <FaUsers className="mr-2" />
                    {user.role === 'owner' ? 'Prihlásiť sa' : 'Vytvoriť lekciu'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Daycare */}
          {activeSection === 'daycare' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Denné pobyty</h2>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="text-center py-8">
                  <FaPaw className="mx-auto text-4xl text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Jasle pre psov</h3>
                  <p className="text-gray-600 mb-4">
                    {user.role === 'owner' 
                      ? 'Rezervujte denné pobyty pre vašich psov.'
                      : 'Spravujte denné pobyty a starostlivosť.'}
                  </p>
                  <button
                    onClick={() => alert('Denné pobyty budú čoskoro dostupné!')}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg flex items-center mx-auto"
                  >
                    <FaPaw className="mr-2" />
                    {user.role === 'owner' ? 'Rezervovať pobyt' : 'Spravovať pobyty'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Other sections */}
          {!['overview', 'dogs', 'bookings', 'sessions', 'schedule', 'daycare'].includes(activeSection) && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <FaCogs className="mx-auto text-4xl text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Sekcia "{navigationItems.find(item => item.id === activeSection)?.label}" sa vyvíja
              </h3>
              <p className="text-gray-600">
                Táto funkcia bude čoskoro dostupná. Zatiaľ si môžete pozrieť prehľad.
              </p>
              <button
                onClick={() => setActiveSection('overview')}
                className="mt-4 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
              >
                Späť na prehľad
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
} 