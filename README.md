# 🐕 Dog Booking System - Fáza 1: MVP Rezervačného Systému

## 📋 Prehľad Projektu

Dog Booking System je komplexná platforma pre správu rezervácií a tréningov psov. Majitelia môžu spravovať rezervácie pre viacerých psov, zatiaľ čo tréneri môžu spravovať individuálne tréningy, skupinové sessions a psiu škôlku.

### 🎯 Ciele MVP
- **Doba implementácie**: 1-2 mesiace
- **Majitelia**: Správa rezervácií pre viacerých psov
- **Tréneri**: Správa individuálnych tréningov, skupinových sessions a psej škôlky
- **Mobile-first**: PWA-ready aplikácia s moderným UX

## 🛠 Technologický Stack

### Frontend
- **Framework**: Next.js 14 + TypeScript
- **Styling**: Tailwind CSS (mobile-first)
- **PWA**: next-pwa + Workbox
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod validation
- **UI Components**: Headless UI + Custom components

### Backend
- **Framework**: Laravel 10 + Sanctum
- **Authentication**: OAuth (Google/Facebook/Apple) + Email/Password
- **API**: REST API with JSON responses
- **Queue**: Redis-based job queue

### Databáza a Infraštruktúra
- **Databáza**: MariaDB 10.9
- **Cache**: Redis
- **Úložisko médií**: AWS S3 (fotky psov)
- **Notifikácie**: Firebase Cloud Messaging (push), Mailgun (email)
- **CI/CD**: GitHub Actions, Docker, DigitalOcean deploy

## 🏗 Architektúra Projektu

```
dog-booking-system/
├── backend/                 # Laravel API
│   ├── app/
│   │   ├── database/migrations/ # Databázové migrácie
│   │   ├── config/             # Konfigurácie
│   │   └── Dockerfile
│   └── Dockerfile
├── frontend/               # Next.js aplikácia
│   ├── src/
│   │   ├── components/     # React komponenty
│   │   ├── pages/         # Next.js stránky
│   │   ├── hooks/         # Custom hooks
│   │   └── stores/        # Zustand stores
│   └── Dockerfile
├── docker/                # Docker konfigurácie
│   ├── nginx/
│   └── mysql/
├── .github/workflows/     # CI/CD pipeline
└── docker-compose.yml     # Vývojové prostredie
```

## 🚀 Rýchly Štart

### Predpoklady
- Docker & Docker Compose
- Node.js 18+ (pre lokálny vývoj)
- PHP 8.2+ & Composer (pre lokálny vývoj)

### 1. Klónovanie a Spustenie
```bash
git clone <repository-url>
cd dog-booking-system

# Spustenie všetkých služieb
docker-compose up -d

# Sledovanie logov
docker-compose logs -f
```

### 2. Prístup k Aplikácii
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000/api
- **phpMyAdmin**: http://localhost:8080

### 3. Nastavenie Backend (prvé spustenie)
```bash
# Skopírovanie env súboru
cp backend/env.example backend/.env

# Inštalácia závislostí
cd backend && composer install

# Generovanie kľúča aplikácie
php artisan key:generate

# Spustenie migrácií
php artisan migrate

# Vytvorenie prvého trenéra
php artisan tinker
> User::create(['name' => 'Test Trainer', 'email' => 'trainer@test.com', 'role' => 'trainer', 'password' => Hash::make('password')])
```

## 📊 Dátový Model

### Hlavné Entity
```sql
-- Používatelia (majitelia a tréneri)
users (id, name, email, role, phone, bio, avatar_url, oauth_providers, ...)

-- Psy
dogs (id, owner_id, name, breed, age, size, photo_url, medical_notes, ...)

-- Individuálne rezervácie
bookings (id, dog_id, trainer_id, service_type, booking_date, start_time, status, ...)

-- Opakované rozvrhy škôlky
daycare_schedules (id, trainer_id, title, location, capacity, days_of_week, ...)

-- Skupinové sessions (generované z rozvrhov)
sessions (id, trainer_id, schedule_id, title, start_time, capacity, ...)

-- Prihlásenia na sessions
session_signups (id, session_id, dog_id, status, notes, ...)

-- Čakacia listina
session_waitlist (id, session_id, dog_id, joined_waitlist_at, ...)

-- Hodnotenia
reviews (id, dog_id, trainer_id, booking_id, session_id, rating, comment, ...)
```

## 🔄 Hlavné User Flows

### 1. Registrácia a Prihlásenie
- **Cesty**: `/register`, `/login`
- **OAuth**: Google/Facebook/Apple alebo email+heslo
- **API**: `POST /api/auth/register`, `POST /api/auth/login`

### 2. Správa Psov
- **Cesta**: `/profile/dogs`
- **CRUD**: Pridanie, úprava, zmazanie psov cez modály
- **API**: `GET|POST|PUT|DELETE /api/owners/me/dogs`

### 3. Individuálne Rezervácie
- **Cesty**: `/bookings/new`, `/bookings/[date]`
- **Flow**: Výber psa → typ služby → dátum+čas → potvrdenie
- **API**: `GET /api/bookings`, `POST /api/bookings`

### 4. Skupinové Sessions
- **Tréner**: `/trainer/sessions` - správa sessions
- **Majiteľ**: Prihlásenie psa cez dropdown
- **API**: `POST /api/sessions/{id}/signup`

### 5. Psia Škôlka
- **Rozvrhy**: Opakované rozvrhy s `days_of_week` JSON
- **Generovanie**: Cron job vytvára sessions podľa rozvrhu
- **Schvaľovanie**: Tréner schvaľuje prihlásenia

## 🔧 API Endpoints

### Autentifikácia
```
POST /api/auth/register     # Registrácia
POST /api/auth/login        # Prihlásenie
POST /api/auth/logout       # Odhlásenie
```

### Správa Psov
```
GET    /api/owners/me/dogs     # Zoznam psov
POST   /api/owners/me/dogs     # Pridanie psa
PUT    /api/dogs/{id}          # Úprava psa
DELETE /api/dogs/{id}          # Zmazanie psa
```

### Rezervácie
```
GET  /api/bookings             # Zoznam rezervácií
POST /api/bookings             # Nová rezervácia
PUT  /api/bookings/{id}/status # Schválenie/odmietnutie
```

### Sessions a Škôlka
```
GET    /api/sessions                    # Zoznam sessions
POST   /api/sessions                    # Nová session
POST   /api/sessions/{id}/signup        # Prihlásenie psa
DELETE /api/sessions/{id}/signup        # Odhlásenie psa
POST   /api/sessions/{id}/waitlist      # Pridanie na waitlist
```

## 🎨 Frontend Komponenty

### Hlavné Komponenty
- `OnboardingWizard` - Úvodný sprievodca
- `DogsList` / `DogForm` - Správa psov
- `CalendarView` - Kalendárny pohľad
- `BookingForm` - Formulár rezervácie
- `SessionsListTrainer` - Zoznam sessions pre trenéra
- `SessionDetailModal` - Detail session s prihláseniami
- `BookingsList` - Zoznam rezervácií
- `WaitlistButton` - Tlačidlo pre waitlist
- `ReviewForm` - Formulár hodnotenia
- `TrainerDashboard` - Dashboard pre trenéra
- `ChatWidget` - Chat widget

### Stránky
```
/                           # Úvodná stránka
/register, /login          # Autentifikácia
/profile/dogs              # Správa psov
/bookings/new              # Nová rezervácia
/bookings/[date]           # Rezervácie pre dátum
/trainer/sessions          # Sessions trenéra
/trainer/bookings          # Rezervácie trenéra
```

## 🔐 Bezpečnosť a Autentifikácia

### Laravel Sanctum
- Token-based autentifikácia
- CSRF ochrana
- Rate limiting

### Role a Permissions
- **owner**: Správa psov, rezervácie, prihlásenia
- **trainer**: Správa sessions, schvaľovanie rezervácií

## 📱 PWA Funkcie

### Service Worker
- Offline support pre základné funkcie
- Background sync pre rezervácie
- Push notifikácie

### Manifest
- Inštalácia ako natívna aplikácia
- Splash screen s logom
- Theme colors

## 🧪 Testovanie

### Backend (PHPUnit)
```bash
cd backend
composer test
vendor/bin/phpunit --coverage-html coverage
```

### Frontend (Jest + Testing Library)
```bash
cd frontend
npm test
npm run test:coverage
```

### Ciele Pokrytia
- **Backend**: > 80% test coverage
- **Frontend**: > 80% test coverage
- **Lighthouse**: Mobile Performance/Accessibility > 90
- **TTI**: < 2 sekundy

## 🚀 DevOps a Nasadenie

### GitHub Actions Pipeline
1. **Lint & Test**: ESLint, PHPUnit, Jest
2. **Build**: Docker images
3. **Lighthouse CI**: Performance audit
4. **Deploy**: DigitalOcean droplet
5. **Backup**: Nočné DB dump → S3

### Docker Compose Služby
- `frontend`: Next.js aplikácia
- `backend`: Laravel s PHP-FPM
- `nginx`: Reverse proxy
- `mariadb`: Databáza
- `redis`: Cache a queue
- `phpmyadmin`: DB management

### Produkčné Nastavenie
```bash
# Produkčné prostredie
docker-compose -f docker-compose.prod.yml up -d

# SSL certifikáty
certbot --nginx -d yourdomain.com

# Monitoring
docker-compose -f docker-compose.monitoring.yml up -d
```

## 📈 Monitoring a Metriky

### Aplikačné Metriky
- **Sentry**: Error tracking
- **Lighthouse CI**: Performance monitoring
- **Google Analytics**: User behavior

### Infraštruktúra
- **Docker Stats**: Container monitoring
- **Database Performance**: Slow query log
- **Redis Monitor**: Cache hit rates

## 🔄 Development Workflow

### Týždenné Sprinty
1. **Plánovanie**: Jira/Trello backlog
2. **Vývoj**: Feature branches
3. **Code Review**: Pull requests
4. **Testing**: Automated + manual QA
5. **Deploy**: Staging → Production

### Git Workflow
```bash
# Feature development
git checkout -b feature/session-signup
git commit -m "feat: add session signup functionality"
git push origin feature/session-signup
# → Create Pull Request
```

## 📋 Ďalšie Kroky

### Fáza 2 (Next Steps)
- [ ] Chat systém medzi majiteľmi a trénermi
- [ ] Online platby (Stripe/PayPal)
- [ ] Kalendárna integrácia (Google Calendar)
- [ ] Video tréningy a streaming
- [ ] Mobilná aplikácia (React Native)
- [ ] Multi-tenant architecture

### Immediate TODOs
- [ ] Wireframy vo Figma
- [ ] Detailný backlog v Jira/Trello
- [ ] Nastavenie produkčných secrets
- [ ] SSL certifikáty a doména
- [ ] Firebase a AWS konfigurácia

## 🤝 Prispievanie

1. Fork repository
2. Vytvorte feature branch
3. Commit s conventional commits formátom
4. Push do branch
5. Vytvorte Pull Request

## 📄 Licencia

MIT License - viz [LICENSE](LICENSE) súbor pre detaily.

---

**Postavené s ❤️ pre komunitu milovníkov psov**
