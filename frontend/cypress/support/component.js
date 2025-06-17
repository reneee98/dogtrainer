// Import commands.js using ES2015 syntax:
import './commands'

// Import component testing support
import { mount } from 'cypress/react'

// Augment the Cypress namespace to include type definitions for custom commands
declare global {
  namespace Cypress {
    interface Chainable {
      mount: typeof mount
    }
  }
}

Cypress.Commands.add('mount', mount)

// Example cypress/support/component.js
import { mount } from 'cypress/react18'

Cypress.Commands.add('mount', mount)

// Import styles if needed
import '../../styles/globals.css' 