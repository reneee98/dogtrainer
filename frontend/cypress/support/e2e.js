// Import commands.js using ES2015 syntax:
import './commands'

// Import code coverage
import '@cypress/code-coverage/support'

// Cypress global configuration
Cypress.on('uncaught:exception', (err, runnable) => {
  // Returning false here prevents Cypress from failing the test
  // on uncaught exceptions. Only do this for known issues.
  if (err.message.includes('ResizeObserver loop limit exceeded')) {
    return false
  }
  return true
})

// Before each test
beforeEach(() => {
  // Clear local storage and session storage
  cy.clearLocalStorage()
  cy.clearCookies()
  
  // Set viewport
  cy.viewport(1280, 720)
  
  // Intercept common API calls
  cy.intercept('GET', '/api/health', { fixture: 'health.json' }).as('healthCheck')
  cy.intercept('GET', '/api/auth/me', { statusCode: 401 }).as('checkAuth')
})

// Global error handling
Cypress.Commands.add('handleErrors', () => {
  cy.window().then((win) => {
    win.addEventListener('error', (e) => {
      if (e.message.includes('Script error')) {
        return false
      }
    })
  })
}) 