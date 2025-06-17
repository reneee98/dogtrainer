describe('Authentication Flows', () => {
  beforeEach(() => {
    cy.cleanupTestData()
    cy.visit('/')
  })

  describe('Registration Flow', () => {
    it('should successfully register a new dog owner', () => {
      const userData = {
        name: 'Ján Novák',
        email: 'jan.novak@test.com',
        phone: '+421 901 234 567',
        password: 'SecurePassword123!',
        role: 'owner'
      }

      // Intercept registration API call
      cy.intercept('POST', '/api/auth/register', {
        statusCode: 201,
        body: {
          message: 'Registrácia úspešná',
          user: {
            id: 1,
            ...userData,
            role: 'owner'
          },
          token: 'fake-jwt-token'
        }
      }).as('registerRequest')

      // Navigate to registration page
      cy.visit('/register')
      cy.url().should('include', '/register')

      // Fill out registration form
      cy.getByDataCy('name-input').type(userData.name)
      cy.getByDataCy('email-input').type(userData.email)
      cy.getByDataCy('phone-input').type(userData.phone)
      cy.getByDataCy('password-input').type(userData.password)
      cy.getByDataCy('password-confirmation-input').type(userData.password)
      cy.getByDataCy('role-select').select(userData.role)
      
      // Accept terms and conditions
      cy.getByDataCy('terms-checkbox').check()

      // Submit registration
      cy.getByDataCy('register-button').click()

      // Verify API call
      cy.waitForApiCall('@registerRequest')

      // Should redirect to dashboard
      cy.url().should('include', '/dashboard')
      cy.contains('Vitajte v Dog Booking System').should('exist')
    })

    it('should successfully register a new trainer', () => {
      const trainerData = {
        name: 'Mária Trénerová',
        email: 'maria.trenerova@test.com',
        phone: '+421 905 555 123',
        password: 'TrainerPass456!',
        role: 'trainer'
      }

      cy.intercept('POST', '/api/auth/register', {
        statusCode: 201,
        body: {
          message: 'Registrácia úspešná',
          user: { id: 2, ...trainerData },
          token: 'fake-trainer-token'
        }
      }).as('registerTrainer')

      cy.register(trainerData)
      cy.waitForApiCall('@registerTrainer')

      // Should redirect to trainer onboarding
      cy.url().should('include', '/trainer/onboarding')
      cy.contains('Nastavenie profilu trénera').should('exist')
    })

    it('should show validation errors for invalid input', () => {
      cy.visit('/register')

      // Try to submit empty form
      cy.getByDataCy('register-button').click()

      // Should show validation errors
      cy.contains('Meno je povinné').should('exist')
      cy.contains('Email je povinný').should('exist')
      cy.contains('Telefón je povinný').should('exist')
      cy.contains('Heslo je povinné').should('exist')

      // Test email validation
      cy.getByDataCy('email-input').type('invalid-email')
      cy.getByDataCy('name-input').click() // Trigger blur
      cy.contains('Neplatný formát emailu').should('exist')

      // Test password confirmation mismatch
      cy.getByDataCy('password-input').type('password123')
      cy.getByDataCy('password-confirmation-input').type('different123')
      cy.getByDataCy('name-input').click() // Trigger blur
      cy.contains('Heslá sa nezhodujú').should('exist')
    })

    it('should handle registration errors from server', () => {
      cy.intercept('POST', '/api/auth/register', {
        statusCode: 422,
        body: {
          message: 'Email už existuje',
          errors: {
            email: ['Tento email už je registrovaný']
          }
        }
      }).as('registerError')

      const userData = {
        name: 'Test User',
        email: 'existing@test.com',
        phone: '+421 901 123 456',
        password: 'password123',
        role: 'owner'
      }

      cy.register(userData)
      cy.waitForApiCall('@registerError')

      // Should show server error
      cy.contains('Tento email už je registrovaný').should('exist')
      cy.url().should('include', '/register')
    })
  })

  describe('Login Flow', () => {
    it('should successfully login as owner', () => {
      const loginData = {
        email: 'owner@test.com',
        password: 'password123'
      }

      cy.intercept('POST', '/api/auth/login', {
        statusCode: 200,
        body: {
          message: 'Prihlásenie úspešné',
          user: {
            id: 1,
            email: loginData.email,
            name: 'Test Owner',
            role: 'owner'
          },
          token: 'fake-owner-token'
        }
      }).as('loginRequest')

      cy.intercept('GET', '/api/auth/me', {
        statusCode: 200,
        body: {
          id: 1,
          email: loginData.email,
          name: 'Test Owner',
          role: 'owner'
        }
      }).as('getUserData')

      cy.visit('/login')
      cy.getByDataCy('email-input').type(loginData.email)
      cy.getByDataCy('password-input').type(loginData.password)
      cy.getByDataCy('login-button').click()

      cy.waitForApiCall('@loginRequest')
      cy.url().should('include', '/dashboard')
      cy.contains('Test Owner').should('exist')
    })

    it('should successfully login as trainer', () => {
      const loginData = {
        email: 'trainer@test.com',
        password: 'password123'
      }

      cy.intercept('POST', '/api/auth/login', {
        statusCode: 200,
        body: {
          user: {
            id: 2,
            email: loginData.email,
            name: 'Test Trainer',
            role: 'trainer'
          },
          token: 'fake-trainer-token'
        }
      }).as('trainerLogin')

      cy.login(loginData.email, loginData.password)
      cy.waitForApiCall('@trainerLogin')

      // Should redirect to trainer dashboard
      cy.url().should('include', '/trainer/dashboard')
      cy.contains('Trénerský prehľad').should('exist')
    })

    it('should show error for invalid credentials', () => {
      cy.intercept('POST', '/api/auth/login', {
        statusCode: 401,
        body: {
          message: 'Neplatné prihlasovacie údaje'
        }
      }).as('invalidLogin')

      cy.visit('/login')
      cy.getByDataCy('email-input').type('wrong@test.com')
      cy.getByDataCy('password-input').type('wrongpassword')
      cy.getByDataCy('login-button').click()

      cy.waitForApiCall('@invalidLogin')
      cy.contains('Neplatné prihlasovacie údaje').should('exist')
      cy.url().should('include', '/login')
    })

    it('should show validation errors for empty fields', () => {
      cy.visit('/login')
      cy.getByDataCy('login-button').click()

      cy.contains('Email je povinný').should('exist')
      cy.contains('Heslo je povinné').should('exist')
    })

    it('should remember user login with "Remember me" option', () => {
      const loginData = {
        email: 'owner@test.com',
        password: 'password123'
      }

      cy.intercept('POST', '/api/auth/login', {
        statusCode: 200,
        body: {
          user: { id: 1, email: loginData.email, role: 'owner' },
          token: 'persistent-token'
        }
      }).as('persistentLogin')

      cy.visit('/login')
      cy.getByDataCy('email-input').type(loginData.email)
      cy.getByDataCy('password-input').type(loginData.password)
      cy.getByDataCy('remember-checkbox').check()
      cy.getByDataCy('login-button').click()

      cy.waitForApiCall('@persistentLogin')

      // Clear session storage but keep localStorage
      cy.clearCookies()
      cy.reload()

      // Should still be logged in
      cy.url().should('include', '/dashboard')
    })
  })

  describe('Logout Flow', () => {
    beforeEach(() => {
      cy.loginAsOwner()
    })

    it('should successfully logout user', () => {
      cy.intercept('POST', '/api/auth/logout', {
        statusCode: 200,
        body: { message: 'Odhlásenie úspešné' }
      }).as('logoutRequest')

      cy.getByDataCy('user-menu').click()
      cy.getByDataCy('logout-button').click()

      cy.waitForApiCall('@logoutRequest')
      cy.url().should('include', '/login')
      
      // Local storage should be cleared
      cy.window().its('localStorage').invoke('getItem', 'auth-token').should('not.exist')
    })

    it('should logout from all devices', () => {
      cy.intercept('POST', '/api/auth/logout-all', {
        statusCode: 200,
        body: { message: 'Odhlásenie zo všetkých zariadení úspešné' }
      }).as('logoutAllRequest')

      cy.getByDataCy('user-menu').click()
      cy.getByDataCy('logout-all-button').click()
      cy.getByDataCy('confirm-logout-all-button').click()

      cy.waitForApiCall('@logoutAllRequest')
      cy.url().should('include', '/login')
      cy.contains('Odhlásenie zo všetkých zariadení úspešné').should('exist')
    })
  })

  describe('Password Reset Flow', () => {
    it('should send password reset email', () => {
      cy.intercept('POST', '/api/auth/forgot-password', {
        statusCode: 200,
        body: { message: 'Email na resetovanie hesla bol odoslaný' }
      }).as('forgotPassword')

      cy.visit('/login')
      cy.getByDataCy('forgot-password-link').click()
      cy.url().should('include', '/forgot-password')

      cy.getByDataCy('email-input').type('user@test.com')
      cy.getByDataCy('send-reset-button').click()

      cy.waitForApiCall('@forgotPassword')
      cy.contains('Email na resetovanie hesla bol odoslaný').should('exist')
    })

    it('should reset password with valid token', () => {
      const resetToken = 'valid-reset-token'
      
      cy.intercept('POST', '/api/auth/reset-password', {
        statusCode: 200,
        body: { message: 'Heslo bolo úspešne zmenené' }
      }).as('resetPassword')

      cy.visit(`/reset-password?token=${resetToken}`)
      
      cy.getByDataCy('password-input').type('NewPassword123!')
      cy.getByDataCy('password-confirmation-input').type('NewPassword123!')
      cy.getByDataCy('reset-password-button').click()

      cy.waitForApiCall('@resetPassword')
      cy.url().should('include', '/login')
      cy.contains('Heslo bolo úspešne zmenené').should('exist')
    })
  })

  describe('Session Management', () => {
    it('should handle expired token', () => {
      cy.loginAsOwner()

      // Mock expired token response
      cy.intercept('GET', '/api/dogs', {
        statusCode: 401,
        body: { message: 'Token vypršal' }
      }).as('expiredToken')

      cy.visit('/dogs')
      cy.waitForApiCall('@expiredToken')

      // Should redirect to login
      cy.url().should('include', '/login')
      cy.contains('Vaša relácia vypršala').should('exist')
    })

    it('should auto-refresh token when close to expiry', () => {
      cy.loginAsOwner()

      cy.intercept('POST', '/api/auth/refresh', {
        statusCode: 200,
        body: {
          token: 'new-refreshed-token',
          user: { id: 1, email: 'owner@test.com', role: 'owner' }
        }
      }).as('refreshToken')

      // Simulate token close to expiry
      cy.window().then((win) => {
        win.localStorage.setItem('token-expires-at', Date.now() + 60000) // 1 minute
      })

      cy.visit('/dashboard')
      cy.waitForApiCall('@refreshToken')

      // Should continue to work normally
      cy.contains('Dashboard').should('exist')
    })
  })
}) 