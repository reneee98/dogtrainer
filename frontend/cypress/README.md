# Cypress E2E Testing Suite

This directory contains comprehensive end-to-end tests for the Dog Booking System frontend application.

## Overview

The Cypress test suite covers all major user flows and functionality including:

- **Authentication**: Registration, login, logout, password reset
- **Dog Management**: CRUD operations for dog profiles
- **Individual Booking**: Session booking and trainer approval workflow
- **Group Sessions**: Group session creation, signup, and management
- **Daycare Schedule**: Schedule creation, auto-generation, and booking
- **Waitlist Flow**: Joining waitlists, notifications, and position management
- **Review System**: Writing reviews, ratings, and trainer responses
- **Cancellation & Rescheduling**: Booking modifications and policy handling

## Directory Structure

```
cypress/
├── e2e/                          # End-to-end test files
│   ├── auth.cy.js               # Authentication flows
│   ├── dog-management.cy.js     # Dog CRUD operations
│   ├── individual-booking.cy.js # Individual session booking
│   ├── group-sessions.cy.js     # Group session management
│   ├── daycare-schedule.cy.js   # Daycare functionality
│   ├── waitlist-flow.cy.js      # Waitlist management
│   ├── review-flow.cy.js        # Review and rating system
│   └── cancellation-rescheduling.cy.js # Booking modifications
├── support/                      # Support files and commands
│   ├── commands.js              # Custom Cypress commands
│   ├── e2e.js                   # E2E configuration
│   └── component.js             # Component testing setup
├── fixtures/                     # Test data and mock responses
│   └── health.json              # API health check response
└── cypress.config.js            # Cypress configuration
```

## Test Features

### Custom Commands

The test suite includes custom Cypress commands for common operations:

- **Authentication**: `cy.login()`, `cy.loginAsOwner()`, `cy.loginAsTrainer()`, `cy.logout()`
- **Dog Management**: `cy.createDog()`, `cy.editDog()`, `cy.deleteDog()`
- **Booking**: `cy.bookSession()`, `cy.cancelBooking()`, `cy.rescheduleBooking()`
- **Waitlist**: `cy.joinWaitlist()`, `cy.leaveWaitlist()`
- **Reviews**: `cy.writeReview()`
- **API Interactions**: `cy.apiLogin()`, `cy.apiRequest()`, `cy.waitForApiCall()`
- **Utilities**: `cy.getByDataCy()`, `cy.selectDate()`, `cy.uploadFile()`

### Test Data Management

- Tests use mocked API responses for consistent, fast execution
- Each test starts with a clean state via `cy.cleanupTestData()`
- Fixtures provide realistic test data for various scenarios

### Coverage Areas

#### Authentication (auth.cy.js)
- User registration for owners and trainers
- Login/logout functionality
- Password reset flow
- Session management and token refresh
- Form validation and error handling

#### Dog Management (dog-management.cy.js)
- Creating dog profiles with photos
- Viewing and filtering dog lists
- Editing dog information and medical records
- Deleting dogs with confirmation
- Medical information management
- Booking history for individual dogs

#### Individual Booking (individual-booking.cy.js)
- Browsing available individual sessions
- Booking sessions with dog selection
- Trainer approval workflow
- Booking status management
- Payment information handling
- Notification system integration

#### Group Sessions (group-sessions.cy.js)
- Creating group sessions (trainer view)
- Recurring session generation
- Session discovery and filtering
- Multi-dog signup for families
- Capacity management
- Group dynamics analysis

#### Daycare Schedule (daycare-schedule.cy.js)
- Schedule creation and management
- Auto-generation of daycare sessions
- Full-day vs. custom hour bookings
- Recurring daycare reservations
- Staff attendance management
- Emergency contact information

#### Waitlist Flow (waitlist-flow.cy.js)
- Joining waitlists for full sessions
- Priority-based waitlist positioning
- Notification when spots become available
- Waitlist management and preferences
- Trainer waitlist administration
- Bulk waitlist operations

#### Review System (review-flow.cy.js)
- Writing comprehensive reviews with ratings
- Photo uploads with reviews
- Review editing within time limits
- Public vs. private review settings
- Trainer responses to reviews
- Review analytics and insights

#### Cancellation & Rescheduling (cancellation-rescheduling.cy.js)
- Booking cancellation with refund policies
- Rescheduling requests and approvals
- Emergency cancellation handling
- Trainer-initiated cancellations
- Policy enforcement and fee calculation
- Refund processing tracking

## Running Tests

### Prerequisites

```bash
# Install dependencies
npm install

# Ensure the application is running
npm run dev
```

### Local Development

```bash
# Open Cypress Test Runner (interactive)
npm run cypress:open

# Run all tests headlessly
npm run cypress:run

# Run specific test file
npx cypress run --spec "cypress/e2e/auth.cy.js"

# Run tests with specific browser
npm run cypress:run:chrome
npm run cypress:run:firefox
```

### CI/CD Integration

Tests are automatically run in the CI/CD pipeline with:

```bash
# Run all E2E tests
npm run e2e

# Run with video recording and screenshots
npm run e2e:headed
```

## Test Configuration

### Environment Variables

Set these environment variables for test configuration:

```bash
CYPRESS_BASE_URL=http://localhost:3000
CYPRESS_API_URL=http://localhost:8000/api
CYPRESS_COVERAGE=true
```

### Data Attributes

Tests rely on `data-cy` attributes for element selection:

```jsx
// Good - Stable selector
<button data-cy="login-button">Login</button>

// Avoid - Fragile selectors
<button className="btn-primary">Login</button>
```

### API Mocking

Tests use Cypress intercepts to mock API responses:

```javascript
cy.intercept('GET', '/api/dogs', { fixture: 'dogs.json' }).as('getDogs')
cy.wait('@getDogs')
```

## Best Practices

### Test Structure

1. **Arrange**: Set up test data and mock API responses
2. **Act**: Perform user actions (clicks, typing, etc.)
3. **Assert**: Verify expected outcomes

### Test Isolation

- Each test is independent and can run in any order
- Clean state is established before each test
- No shared state between test files

### Error Handling

- Tests handle loading states and async operations
- Proper timeouts are set for API calls
- Retry logic for flaky operations

### Maintenance

- Regular review and update of selectors
- Keep test data fixtures up to date
- Monitor test execution times
- Update for new features and UI changes

## Debugging

### Common Issues

1. **Element not found**: Check data-cy attributes exist
2. **API calls timing out**: Verify intercepts are set up correctly
3. **Tests failing in CI but passing locally**: Check for timing issues

### Debug Tools

```bash
# Run with browser visible
npm run e2e:headed

# Debug specific test
npx cypress open --e2e --spec "cypress/e2e/auth.cy.js"

# Enable debug logging
DEBUG=cypress:* npm run cypress:run
```

### Screenshots and Videos

- Screenshots are automatically taken on test failures
- Videos are recorded for all test runs in CI
- Both are stored in `cypress/screenshots/` and `cypress/videos/`

## Contributing

When adding new features:

1. Add appropriate `data-cy` attributes to new components
2. Write corresponding E2E tests
3. Update fixtures if new API endpoints are added
4. Ensure tests pass in both local and CI environments
5. Document any new custom commands in this README

## Test Coverage

The E2E tests aim for comprehensive coverage of:

- ✅ All user registration and authentication flows
- ✅ Complete dog management lifecycle
- ✅ End-to-end booking processes for all session types
- ✅ Full waitlist functionality
- ✅ Review and rating system
- ✅ Cancellation and rescheduling workflows
- ✅ Error states and edge cases
- ✅ Multi-role user interactions (owner, trainer, admin)

## Performance

- Tests are optimized for speed with strategic API mocking
- Parallel execution supported for faster CI runs
- Test retries configured for flaky network operations
- Selective test running for specific feature areas

For more information about Cypress testing, visit the [official documentation](https://docs.cypress.io/). 