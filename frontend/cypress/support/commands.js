// Custom authentication commands
Cypress.Commands.add('login', (email, password) => {
  cy.session([email, password], () => {
    cy.visit('/login')
    cy.get('[data-cy=email-input]').type(email)
    cy.get('[data-cy=password-input]').type(password)
    cy.get('[data-cy=login-button]').click()
    cy.url().should('not.include', '/login')
    cy.window().its('localStorage').invoke('getItem', 'auth-token').should('exist')
  })
})

Cypress.Commands.add('loginAsOwner', () => {
  cy.login('owner@test.com', 'password123')
})

Cypress.Commands.add('loginAsTrainer', () => {
  cy.login('trainer@test.com', 'password123')
})

Cypress.Commands.add('loginAsAdmin', () => {
  cy.login('admin@test.com', 'password123')
})

Cypress.Commands.add('logout', () => {
  cy.get('[data-cy=user-menu]').click()
  cy.get('[data-cy=logout-button]').click()
  cy.url().should('include', '/login')
  cy.window().its('localStorage').invoke('getItem', 'auth-token').should('not.exist')
})

// Registration command
Cypress.Commands.add('register', (userData) => {
  cy.visit('/register')
  cy.get('[data-cy=name-input]').type(userData.name)
  cy.get('[data-cy=email-input]').type(userData.email)
  cy.get('[data-cy=phone-input]').type(userData.phone)
  cy.get('[data-cy=password-input]').type(userData.password)
  cy.get('[data-cy=password-confirmation-input]').type(userData.password)
  cy.get('[data-cy=role-select]').select(userData.role)
  cy.get('[data-cy=register-button]').click()
})

// Dog management commands
Cypress.Commands.add('createDog', (dogData) => {
  cy.visit('/dogs/create')
  cy.get('[data-cy=dog-name-input]').type(dogData.name)
  cy.get('[data-cy=dog-breed-input]').type(dogData.breed)
  cy.get('[data-cy=dog-age-input]').type(dogData.age.toString())
  cy.get('[data-cy=dog-size-select]').select(dogData.size)
  cy.get('[data-cy=dog-description-input]').type(dogData.description)
  
  if (dogData.photo) {
    cy.get('[data-cy=dog-photo-input]').selectFile(dogData.photo, { force: true })
  }
  
  cy.get('[data-cy=save-dog-button]').click()
  cy.url().should('include', '/dogs')
  cy.contains(dogData.name).should('exist')
})

Cypress.Commands.add('editDog', (dogName, newData) => {
  cy.visit('/dogs')
  cy.contains(dogName).parent().find('[data-cy=edit-dog-button]').click()
  
  if (newData.name) {
    cy.get('[data-cy=dog-name-input]').clear().type(newData.name)
  }
  if (newData.breed) {
    cy.get('[data-cy=dog-breed-input]').clear().type(newData.breed)
  }
  
  cy.get('[data-cy=save-dog-button]').click()
  cy.url().should('include', '/dogs')
})

Cypress.Commands.add('deleteDog', (dogName) => {
  cy.visit('/dogs')
  cy.contains(dogName).parent().find('[data-cy=delete-dog-button]').click()
  cy.get('[data-cy=confirm-delete-button]').click()
  cy.contains(dogName).should('not.exist')
})

// Booking commands
Cypress.Commands.add('bookSession', (sessionData) => {
  cy.visit('/sessions')
  cy.contains(sessionData.sessionName).parent().find('[data-cy=book-session-button]').click()
  
  if (sessionData.dogName) {
    cy.get('[data-cy=dog-select]').select(sessionData.dogName)
  }
  
  if (sessionData.notes) {
    cy.get('[data-cy=booking-notes-input]').type(sessionData.notes)
  }
  
  cy.get('[data-cy=confirm-booking-button]').click()
  cy.contains('Rezervácia úspešná').should('exist')
})

Cypress.Commands.add('cancelBooking', (bookingId) => {
  cy.visit('/bookings')
  cy.get(`[data-cy=booking-${bookingId}]`).find('[data-cy=cancel-booking-button]').click()
  cy.get('[data-cy=cancel-reason-input]').type('Neočakávané komplikácie')
  cy.get('[data-cy=confirm-cancel-button]').click()
  cy.contains('Rezervácia zrušená').should('exist')
})

// Session management commands
Cypress.Commands.add('createSession', (sessionData) => {
  cy.visit('/trainer/sessions/create')
  cy.get('[data-cy=session-name-input]').type(sessionData.name)
  cy.get('[data-cy=session-description-input]').type(sessionData.description)
  cy.get('[data-cy=session-type-select]').select(sessionData.type)
  cy.get('[data-cy=session-date-input]').type(sessionData.date)
  cy.get('[data-cy=session-time-input]').type(sessionData.time)
  cy.get('[data-cy=session-duration-input]').type(sessionData.duration.toString())
  cy.get('[data-cy=session-capacity-input]').type(sessionData.capacity.toString())
  cy.get('[data-cy=session-price-input]').type(sessionData.price.toString())
  cy.get('[data-cy=save-session-button]').click()
  cy.contains('Session vytvorená').should('exist')
})

// Waitlist commands
Cypress.Commands.add('joinWaitlist', (sessionName) => {
  cy.visit('/sessions')
  cy.contains(sessionName).parent().find('[data-cy=join-waitlist-button]').click()
  cy.get('[data-cy=confirm-waitlist-button]').click()
  cy.contains('Pridaný do čakacej listiny').should('exist')
})

// Review commands
Cypress.Commands.add('writeReview', (reviewData) => {
  cy.visit(`/sessions/${reviewData.sessionId}/review`)
  cy.get('[data-cy=rating-stars]').find(`[data-value="${reviewData.rating}"]`).click()
  cy.get('[data-cy=review-comment-input]').type(reviewData.comment)
  cy.get('[data-cy=submit-review-button]').click()
  cy.contains('Recenzia pridaná').should('exist')
})

// API commands
Cypress.Commands.add('apiLogin', (email, password) => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/auth/login`,
    body: {
      email,
      password
    }
  }).then((response) => {
    window.localStorage.setItem('auth-token', response.body.token)
    window.localStorage.setItem('user', JSON.stringify(response.body.user))
  })
})

Cypress.Commands.add('apiRequest', (method, url, body = {}, headers = {}) => {
  const token = window.localStorage.getItem('auth-token')
  
  return cy.request({
    method,
    url: `${Cypress.env('apiUrl')}${url}`,
    body,
    headers: {
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json',
      ...headers
    }
  })
})

// Utility commands
Cypress.Commands.add('getByDataCy', (selector) => {
  return cy.get(`[data-cy=${selector}]`)
})

Cypress.Commands.add('findByDataCy', { prevSubject: 'element' }, (subject, selector) => {
  return cy.wrap(subject).find(`[data-cy=${selector}]`)
})

Cypress.Commands.add('waitForApiCall', (alias) => {
  cy.wait(alias).then((interception) => {
    expect(interception.response.statusCode).to.be.lessThan(400)
  })
})

Cypress.Commands.add('mockApiResponse', (method, url, response, statusCode = 200) => {
  cy.intercept(method, `${Cypress.env('apiUrl')}${url}`, {
    statusCode,
    body: response
  })
})

// Date picker command
Cypress.Commands.add('selectDate', (selector, date) => {
  cy.get(selector).click()
  
  // Navigate to correct month/year if needed
  const targetDate = new Date(date)
  const targetMonth = targetDate.getMonth()
  const targetYear = targetDate.getFullYear()
  const targetDay = targetDate.getDate()
  
  // Click on the day
  cy.get('.react-datepicker__day').contains(targetDay.toString()).click()
})

// File upload command
Cypress.Commands.add('uploadFile', (selector, fileName) => {
  cy.get(selector).selectFile(`cypress/fixtures/${fileName}`, { force: true })
})

// Wait for loading to complete
Cypress.Commands.add('waitForLoadingToFinish', () => {
  cy.get('[data-cy=loading-spinner]', { timeout: 10000 }).should('not.exist')
  cy.get('[data-cy=loading-skeleton]', { timeout: 10000 }).should('not.exist')
})

// Custom assertions
Cypress.Commands.add('shouldBeVisible', { prevSubject: 'element' }, (subject) => {
  cy.wrap(subject).should('be.visible')
})

Cypress.Commands.add('shouldContainText', { prevSubject: 'element' }, (subject, text) => {
  cy.wrap(subject).should('contain.text', text)
})

// Database cleanup (for testing)
Cypress.Commands.add('cleanupTestData', () => {
  // This would typically make API calls to clean up test data
  cy.task('cleanDatabase')
})

// Seed test data
Cypress.Commands.add('seedTestData', () => {
  cy.task('seedDatabase')
}) 