const { defineConfig } = require('cypress')

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    apiUrl: 'http://localhost:8000/api',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    pageLoadTimeout: 30000,
    
    // Test files
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    
    // Support files
    supportFile: 'cypress/support/e2e.js',
    
    // Downloads folder
    downloadsFolder: 'cypress/downloads',
    
    // Screenshots and videos
    screenshotsFolder: 'cypress/screenshots',
    videosFolder: 'cypress/videos',
    
    // Environment variables
    env: {
      apiUrl: 'http://localhost:8000/api',
      coverage: false,
      codeCoverage: {
        url: 'http://localhost:3000/__coverage__'
      }
    },

    setupNodeEvents(on, config) {
      // Code coverage task
      require('@cypress/code-coverage/task')(on, config)
      
      // Custom tasks
      on('task', {
        log(message) {
          console.log(message)
          return null
        },
        
        // Database seeding task
        seedDatabase() {
          // This would connect to your test database and seed it
          return null
        },
        
        // Clean database task
        cleanDatabase() {
          // This would clean your test database
          return null
        }
      })

      return config
    },
    
    // Test retries
    retries: {
      runMode: 2,
      openMode: 0
    }
  },

  component: {
    devServer: {
      framework: 'next',
      bundler: 'webpack',
    },
    specPattern: 'cypress/component/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/component.js'
  },
}) 