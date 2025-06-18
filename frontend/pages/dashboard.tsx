import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/router';
import { useEffect, useState, useRef } from 'react';
import TrainerDashboard from '../components/TrainerDashboard';
import ScheduleManagement from '../components/ScheduleManagement';
import OwnerCalendar from '../components/OwnerCalendar';
import SessionsListTrainer from '../components/SessionsListTrainer';
import TrainerCalendar from '../components/TrainerCalendar';
import DogsList from '../components/DogsList';

import OwnerOnboardingFlow from '../components/OwnerOnboardingFlow';
import ServicesManagement from '../components/ServicesManagement';
import { dogApi } from '../lib/api';
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
  FaPlus,
  FaClock,
  FaStar,
  FaChartBar,
  FaHome,
  FaBars,
  FaTimes
} from 'react-icons/fa';

interface DashboardStat {
  title: string;
  value: string;
  icon: JSX.Element;
  color: string;
}

export default function Dashboard() {
  const { user, logout, loading, token } = useAuth();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [dashboardStats, setDashboardStats] = useState({
    dogs: 0,
    bookings: 0,
    sessions: 0,
    reviews: 4.9
  });
  
  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasCheckedForOnboarding, setHasCheckedForOnboarding] = useState(false);

  // Touch/swipe handling
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    
    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && isSidebarOpen) {
      setIsSidebarOpen(false);
    }
    if (isRightSwipe && !isSidebarOpen) {
      setIsSidebarOpen(true);
    }
  };

  // Close sidebar when clicking outside on mobile
  const handleBackdropClick = () => {
    setIsSidebarOpen(false);
  };

  // Close sidebar when section changes on mobile
  const handleSectionChange = (sectionId: string) => {
    setActiveSection(sectionId);
    setIsSidebarOpen(false); // Auto-close on mobile
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
    }
  }, [user, loading, router]);

  // Check if user needs onboarding (only for owners)
  useEffect(() => {
    if (user && user.role === 'owner' && token && !hasCheckedForOnboarding) {
      checkForOnboarding();
    }
  }, [user, token, hasCheckedForOnboarding]);

  const checkForOnboarding = async () => {
    try {
      const dogsResponse = await dogApi.list(token!);
      const dogs = dogsResponse.data?.dogs || [];
      
      // Show onboarding if user has no dogs
      if (dogs.length === 0) {
        setShowOnboarding(true);
      }
      
      setHasCheckedForOnboarding(true);
    } catch (error) {
      console.error('Error checking for onboarding:', error);
      setHasCheckedForOnboarding(true);
    }
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    // Refresh the page or update state to reflect new data
    window.location.reload();
  };

  const handleOnboardingClose = () => {
    setShowOnboarding(false);
  };

  const handleRestartOnboarding = () => {
    setShowOnboarding(true);
  };

  // Close sidebar on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSidebarOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

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
      title: 'Celkom psov',
      value: '3',
      icon: <FaDog />,
      color: 'bg-blue-500'
    },
    {
      title: 'Skupinové tréningy',
      value: '2',
      icon: <FaUsers />,
      color: 'bg-green-500'
    },
    {
      title: 'Rezervácie',
      value: '12',
      icon: <FaCalendarAlt />,
      color: 'bg-purple-500'
    },
    {
      title: 'Dnešné tréningy',
      value: '1',
      icon: <FaClock />,
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
      title: 'Dnešné tréningy',
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
        { id: 'overview', label: 'Prehľad', icon: <FaHome /> },
        { id: 'dogs', label: 'Moji psi', icon: <FaDog /> },
        { id: 'calendar', label: 'Kalendár', icon: <FaCalendarAlt /> },
        { id: 'sessions', label: 'Skupinové tréningy', icon: <FaUsers /> },
        { id: 'daycare', label: 'Denné pobyty', icon: <FaPaw /> },
        { id: 'reviews', label: 'Hodnotenia', icon: <FaStar /> },
        { id: 'notifications', label: 'Notifikácie', icon: <FaBell /> },
        { id: 'reports', label: 'Správy', icon: <FaChartBar /> },
        { id: 'settings', label: 'Nastavenia', icon: <FaCogs /> }
      ]
    : [
        { id: 'overview', label: 'Prehľad', icon: <FaHome /> },
        { id: 'schedule', label: 'Môj rozvrh', icon: <FaCalendarAlt /> },
        { id: 'clients', label: 'Klienti', icon: <FaUsers /> },
        { id: 'services', label: 'Služby', icon: <FaCogs /> },
        { id: 'daycare', label: 'Denné pobyty', icon: <FaPaw /> },
        { id: 'reviews', label: 'Hodnotenia', icon: <FaStar /> },
        { id: 'notifications', label: 'Notifikácie', icon: <FaBell /> },
        { id: 'reports', label: 'Správy', icon: <FaChartBar /> },
        { id: 'settings', label: 'Nastavenia', icon: <FaCogs /> }
      ];

  return (
    <div className="min-h-screen bg-gray-50 lg:bg-gray-100">
      {/* Mobile Header */}
      <header className="lg:hidden bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                aria-label="Otvoriť menu"
              >
                <FaBars className="h-6 w-6" />
              </button>
              <div className="ml-4 flex items-center">
                <FaDog className="h-6 w-6 text-indigo-600 mr-2" />
                <h1 className="text-lg font-bold text-gray-900">Dog Booking</h1>
              </div>
            </div>
            
            <div className="flex items-center">
              <div className="h-8 w-8 bg-indigo-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Desktop Header */}
      <header className="hidden lg:block bg-white shadow-sm border-b border-gray-200">
        <div className="mx-auto px-6">
          <div className="flex justify-between h-14">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <FaDog className="h-7 w-7 text-indigo-600 mr-2" />
                <h1 className="text-lg font-bold text-gray-900">Dog Booking</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <div className="h-7 w-7 bg-indigo-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-medium">
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
                <FaSignOutAlt className="mr-2 text-sm" />
                Odhlásiť sa
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-4rem)] lg:h-screen">
        {/* Mobile Sidebar Backdrop */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={handleBackdropClick}
          />
        )}

        {/* Sidebar */}
        <nav 
          className={`
            fixed lg:static inset-y-0 left-0 z-50 lg:z-auto
            w-80 lg:w-56 bg-white shadow-lg lg:shadow-sm 
            transform transition-transform duration-300 ease-in-out lg:transform-none
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            overflow-y-auto
          `}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Mobile Sidebar Header */}
          <div className="lg:hidden p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="h-10 w-10 bg-indigo-500 rounded-full flex items-center justify-center mr-3">
                  <span className="text-white font-medium">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{user.role === 'owner' ? 'Majiteľ' : 'Tréner'}</p>
                </div>
              </div>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                aria-label="Zavrieť menu"
              >
                <FaTimes className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <div className="p-4">
            <ul className="space-y-2">
              {navigationItems.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => handleSectionChange(item.id)}
                    className={`w-full flex items-center px-3 py-2.5 text-left rounded-lg transition-all duration-200 ${
                      activeSection === item.id
                        ? 'bg-gradient-to-r from-indigo-50 to-indigo-100 text-indigo-700 shadow-sm border border-indigo-200'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 active:bg-gray-100'
                    }`}
                  >
                    <span className={`mr-3 ${
                      activeSection === item.id ? 'text-indigo-600' : 'text-gray-400'
                    }`}>
                      {item.icon}
                    </span>
                    <span className="font-medium text-sm">{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>

            {/* Mobile Logout Button */}
            <div className="lg:hidden mt-8 pt-4 border-t border-gray-200">
              <button
                onClick={handleLogout}
                className="w-full flex items-center px-3 py-3 text-left rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
              >
                <FaSignOutAlt className="mr-3" />
                <span className="font-medium">Odhlásiť sa</span>
              </button>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            {activeSection === 'overview' && (
              <>
                {user.role === 'trainer' ? (
                  <TrainerDashboard setActiveSection={setActiveSection} />
                ) : (
                                      <div className="space-y-6">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-1">
                          Vitajte späť, {user.name}!
                        </h2>
                        <p className="text-gray-600 text-sm">
                          Tu je prehľad vašej aktivity
                        </p>
                      </div>

                      {/* Stats Cards */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {stats.map((stat, index) => (
                          <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
                          <div className="flex flex-col lg:flex-row lg:items-center">
                            <div className={`${stat.color} text-white p-2 rounded-lg mb-3 lg:mb-0 lg:mr-3 w-fit`}>
                              {stat.icon}
                            </div>
                            <div className="lg:flex-1">
                              <h3 className="text-xl font-bold text-gray-900">{stat.value}</h3>
                              <p className="text-gray-600 text-xs">{stat.title}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                                          {/* Quick Actions */}
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Rýchle akcie</h3>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                          <button 
                            onClick={() => setShowOnboarding(true)}
                            className="flex items-center p-3 bg-blue-50 rounded-lg hover:bg-blue-100 active:bg-blue-200 transition-colors"
                          >
                            <FaPlus className="text-blue-600 mr-3" />
                            <span className="text-blue-900 font-medium text-sm">Pridať psa</span>
                          </button>
                          <button className="flex items-center p-3 bg-green-50 rounded-lg hover:bg-green-100 active:bg-green-200 transition-colors">
                            <FaCalendarAlt className="text-green-600 mr-3" />
                            <span className="text-green-900 font-medium text-sm">Rezervovať tréning</span>
                          </button>
                          <button className="flex items-center p-3 bg-purple-50 rounded-lg hover:bg-purple-100 active:bg-purple-200 transition-colors">
                            <FaUsers className="text-purple-600 mr-3" />
                            <span className="text-purple-900 font-medium text-sm">Skupinové tréningy</span>
                          </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Dogs Management */}
            {activeSection === 'dogs' && user.role === 'owner' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Moji psi</h2>
                <DogsList />
              </div>
            )}

            {/* Calendar - Owner's Calendar View */}
            {activeSection === 'calendar' && user.role === 'owner' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Kalendár tréningov a služieb</h2>
                <OwnerCalendar />
              </div>
            )}

            {/* Sessions */}
            {activeSection === 'sessions' && user.role === 'owner' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Skupinové tréningy</h2>
                <OwnerCalendar />
              </div>
            )}

            {/* Trainer Schedule - Calendar View */}
            {activeSection === 'schedule' && user.role === 'trainer' && (
              <TrainerCalendar />
            )}

            {/* Trainer Services - Management View */}
            {activeSection === 'services' && user.role === 'trainer' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Správa služieb</h2>
                <ServicesManagement />
              </div>
            )}

            {/* Daycare */}
            {activeSection === 'daycare' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Denné pobyty</h2>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="text-center py-6">
                    <FaPaw className="mx-auto text-4xl text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Jasle pre psov</h3>
                    <p className="text-gray-600 mb-6 text-sm">
                      {user.role === 'owner' 
                        ? 'Rezervujte denné pobyty pre vašich psov.'
                        : 'Spravujte denné pobyty a starostlivosť.'}
                    </p>
                    <button
                      onClick={() => alert('Denné pobyty budú čoskoro dostupné!')}
                      className="bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white px-6 py-2.5 rounded-lg flex items-center mx-auto transition-colors text-sm font-medium"
                    >
                      <FaPaw className="mr-2 text-sm" />
                      {user.role === 'owner' ? 'Rezervovať pobyt' : 'Spravovať pobyty'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Other sections */}
            {!['overview', 'dogs', 'calendar', 'sessions', 'schedule', 'services', 'daycare', 'settings'].includes(activeSection) && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
                <FaCogs className="mx-auto text-4xl text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Sekcia "{navigationItems.find(item => item.id === activeSection)?.label}" sa vyvíja
                </h3>
                <p className="text-gray-600 text-sm">
                  Táto funkcia bude čoskoro dostupná. Zatiaľ si môžete pozrieť prehľad.
                </p>
              </div>
            )}

            {/* Settings */}
            {activeSection === 'settings' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Nastavenia</h2>
                
                <div className="space-y-6">
                  {/* Account Settings */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Nastavenia účtu</h3>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between py-3 border-b border-gray-200">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">Meno</h4>
                          <p className="text-sm text-gray-600">{user.name}</p>
                        </div>
                        <button className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
                          Upraviť
                        </button>
                      </div>
                      
                      <div className="flex items-center justify-between py-3 border-b border-gray-200">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">Email</h4>
                          <p className="text-sm text-gray-600">{user.email}</p>
                        </div>
                        <button className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
                          Upraviť
                        </button>
                      </div>

                      <div className="flex items-center justify-between py-3">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">Rola</h4>
                          <p className="text-sm text-gray-600 capitalize">
                            {user.role === 'owner' ? 'Majiteľ psa' : 'Tréner'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Onboarding Settings - Only for owners */}
                  {user.role === 'owner' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Sprievodca nastavením</h3>
                      
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-gray-900 mb-2">
                            Nastavenie účtu
                          </h4>
                          <p className="text-sm text-gray-600 mb-4">
                            Spustite znova sprievodcu nastavením účtu, ktorý vám pomôže pridať psa, vybrať trénera a prihlásiť sa na prvý tréning.
                          </p>
                        </div>
                        <button
                          onClick={handleRestartOnboarding}
                          className="ml-4 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
                        >
                          <FaCogs className="mr-2" />
                          Spustiť sprievodcu
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Notification Settings */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Notifikácie</h3>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">Email notifikácie</h4>
                          <p className="text-sm text-gray-600">Dostávať notifikácie na email</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" defaultChecked className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">Push notifikácie</h4>
                          <p className="text-sm text-gray-600">Dostávať push notifikácie</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" defaultChecked className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Danger Zone */}
                  <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
                    <h3 className="text-lg font-semibold text-red-900 mb-4">Zóna pozornosti</h3>
                    
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-red-900 mb-2">
                            Zmazať účet
                          </h4>
                          <p className="text-sm text-red-700">
                            Permanentne zmaže váš účet a všetky súvisiace dáta. Táto akcia je nevratná.
                          </p>
                        </div>
                        <button className="ml-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                          Zmazať účet
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Onboarding Flow */}
      {showOnboarding && (
        <OwnerOnboardingFlow
          onComplete={handleOnboardingComplete}
          onClose={handleOnboardingClose}
        />
      )}
    </div>
  );
} 