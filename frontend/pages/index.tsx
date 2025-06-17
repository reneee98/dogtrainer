import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import OnboardingWizard from '../components/OnboardingWizard';
import TrainerDashboard from '../components/TrainerDashboard';
import CalendarView from '../components/CalendarView';
import DogsList from '../components/DogsList';
import ChatWidget from '../components/ChatWidget';
import { 
  AcademicCapIcon,
  HeartIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  SparklesIcon,
  ShieldCheckIcon,
  StarIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

export default function Home() {
  const { user, loading } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Načítava sa Dog Booking System...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Head>
          <title>🐕 Dog Booking System - Rezervačný systém pre psov</title>
          <meta name="description" content="Profesionálny rezervačný systém pre tréning, jasle a starostlivosť o psov. Jednoducho rezervujte termíny online." />
          <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🐕</text></svg>" />
        </Head>

        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
          {/* Navigation Bar */}
          <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center py-4">
                <div className="flex items-center space-x-3">
                  <div className="text-3xl">🐕</div>
                  <div>
                    <h1 className="text-xl font-bold text-gray-900">Dog Booking</h1>
                    <p className="text-xs text-gray-500">System pre psov</p>
                  </div>
                </div>
                <Link href="/auth">
                  <button className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-full font-medium transition-all duration-200 transform hover:scale-105 shadow-lg">
                    Prihlásiť sa
                  </button>
                </Link>
              </div>
            </div>
          </nav>

          {/* Hero Section */}
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary-600/20 to-purple-600/20"></div>
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
              <div className="text-center">
                <div className="mb-8">
                  <span className="inline-flex items-center px-4 py-2 rounded-full text-sm bg-primary-100 text-primary-800 mb-6">
                    <SparklesIcon className="h-4 w-4 mr-2" />
                    Nová generácia starostlivosti o psov
                  </span>
                </div>
                
                <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-8 leading-tight">
                  Rezervačný systém
                  <span className="bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent block">
                    pre psov
                  </span>
                </h1>
                
                <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-4xl mx-auto leading-relaxed">
                  Jednoducho rezervujte profesionálny tréning, bezpečné jasle alebo konzultácie pre vášho psa. 
                  <span className="font-semibold text-primary-600"> Kvalitná starostlivosť na dosah ruky.</span>
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <Link href="/auth">
                    <button className="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white px-10 py-4 rounded-full font-semibold text-lg transition-all duration-300 transform hover:scale-105 shadow-xl">
                      Začať zadarmo
                    </button>
                  </Link>
                  <button className="text-gray-600 hover:text-gray-900 px-8 py-4 font-medium transition-colors">
                    Zistiť viac →
                  </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-8 mt-16 pt-16 border-t border-gray-200">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary-600">500+</div>
                    <div className="text-gray-600">Spokojných psov</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary-600">50+</div>
                    <div className="text-gray-600">Trénerov</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary-600">24/7</div>
                    <div className="text-gray-600">Podpora</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Features Section */}
          <div className="py-24 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-20">
                <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                  Prečo si vybrať náš systém?
                </h2>
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                  Všetko čo potrebujete pre starostlivosť o vášho psa na jednom mieste
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <div className="group text-center p-8 rounded-2xl bg-gradient-to-b from-blue-50 to-blue-100/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
                  <div className="bg-white w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:scale-110 transition-transform">
                    <AcademicCapIcon className="h-10 w-10 text-primary-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">
                    Profesionálny tréning
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    Individuálne aj skupinové tréningy s certifikovanými trénermi pre všetky vekové kategórie
                  </p>
                </div>

                <div className="group text-center p-8 rounded-2xl bg-gradient-to-b from-green-50 to-green-100/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
                  <div className="bg-white w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:scale-110 transition-transform">
                    <HeartIcon className="h-10 w-10 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">
                    Starostlivé jasle
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    Bezpečné a zábavné prostredie pre vášho psa s plným dohľadom a aktivitami
                  </p>
                </div>

                <div className="group text-center p-8 rounded-2xl bg-gradient-to-b from-purple-50 to-purple-100/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
                  <div className="bg-white w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:scale-110 transition-transform">
                    <CalendarDaysIcon className="h-10 w-10 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">
                    Jednoduché rezervácie
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    Rezervujte termíny online kedykoľvek a kdekoľvek pomocou moderného kalendára
                  </p>
                </div>

                <div className="group text-center p-8 rounded-2xl bg-gradient-to-b from-orange-50 to-orange-100/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
                  <div className="bg-white w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:scale-110 transition-transform">
                    <UserGroupIcon className="h-10 w-10 text-orange-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">
                    Komunita majiteľov
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    Spájajte sa s inými majiteľmi psov a zdieľajte skúsenosti v našej komunite
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Benefits Section */}
          <div className="py-24 bg-gradient-to-r from-gray-50 to-blue-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                <div>
                  <h2 className="text-4xl font-bold text-gray-900 mb-8">
                    Výhody pre vás a vášho psa
                  </h2>
                  
                  <div className="space-y-6">
                    <div className="flex items-start space-x-4">
                      <CheckCircleIcon className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold text-gray-900">Profesionálni tréneri</h3>
                        <p className="text-gray-600">Certifikovaní odborníci s rokmi skúseností</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-4">
                      <CheckCircleIcon className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold text-gray-900">Bezpečné prostredie</h3>
                        <p className="text-gray-600">Moderné zariadenie s najvyššími bezpečnostnými štandardmi</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-4">
                      <CheckCircleIcon className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold text-gray-900">Flexibilné časy</h3>
                        <p className="text-gray-600">Rezervácie 7 dní v týždni od 6:00 do 22:00</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-4">
                      <CheckCircleIcon className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold text-gray-900">Pokrok sledovanie</h3>
                        <p className="text-gray-600">Detailné reporty o pokroku vášho psa</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="relative">
                  <div className="bg-white rounded-3xl p-8 shadow-2xl">
                    <div className="text-center">
                      <div className="text-6xl mb-4">🐕‍🦺</div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-4">Spokojní zákazníci</h3>
                      <div className="flex justify-center space-x-1 mb-4">
                        {[...Array(5)].map((_, i) => (
                          <StarIcon key={i} className="h-6 w-6 text-yellow-400 fill-current" />
                        ))}
                      </div>
                      <p className="text-gray-600 text-lg">
                        "Najlepší rezervačný systém pre psov! Môj Charlie miluje tréningy a ja mám pokoj."
                      </p>
                      <p className="text-sm text-gray-500 mt-4">- Mária K., majiteľka zlatého retrievera</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="bg-gradient-to-r from-primary-600 to-purple-600 py-20">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                Pripravení začať?
              </h2>
              <p className="text-xl text-primary-100 mb-10">
                Zaregistrujte sa zadarmo a rezervujte prvý termín pre vášho psa už dnes
              </p>
              <button
                onClick={() => setShowOnboarding(true)}
                className="bg-white text-primary-600 hover:text-primary-700 px-12 py-4 rounded-full font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-xl"
              >
                Registrácia zdarma 🎉
              </button>
              <p className="text-primary-200 text-sm mt-4">
                Žiadne poplatky za registráciu • Zrušenie kedykoľvek
              </p>
            </div>
          </div>

          {/* Footer */}
          <footer className="bg-gray-900 text-white py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="md:col-span-2">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="text-3xl">🐕</div>
                    <div>
                      <h3 className="text-xl font-bold">Dog Booking System</h3>
                      <p className="text-gray-400">Moderný rezervačný systém pre psov</p>
                    </div>
                  </div>
                  <p className="text-gray-400 max-w-md">
                    Poskytujeme profesionálne služby pre vášho psa s dôrazom na kvalitu, bezpečnosť a individuálny prístup.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-4">Služby</h4>
                  <ul className="space-y-2 text-gray-400">
                    <li>Individuálny tréning</li>
                    <li>Skupinové tréningy</li>
                    <li>Denné jasle</li>
                    <li>Konzultácie</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-4">Kontakt</h4>
                  <ul className="space-y-2 text-gray-400">
                    <li>📧 info@dogbooking.sk</li>
                    <li>📞 +421 123 456 789</li>
                    <li>📍 Bratislava, Slovensko</li>
                  </ul>
                </div>
              </div>
              
              <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
                <p>&copy; 2024 Dog Booking System. Všetky práva vyhradené.</p>
              </div>
            </div>
          </footer>

          {showOnboarding && (
            <OnboardingWizard onClose={() => setShowOnboarding(false)} />
          )}

          <ChatWidget />
        </div>
      </>
    );
  }

  // Authenticated user dashboard
  return (
    <>
      <Head>
        <title>Dashboard - Dog Booking System</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {user.role === 'trainer' ? (
            <TrainerDashboard />
          ) : (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Môj kalendár</h2>
                  <CalendarView />
                </div>
                <div>
                  <DogsList />
                </div>
              </div>
            </div>
          )}
        </div>

        <ChatWidget />
      </div>
    </>
  );
} 