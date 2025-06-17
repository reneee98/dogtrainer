describe('Individual Booking & Trainer Approval Flow', () => {
  beforeEach(() => {
    cy.cleanupTestData()
  })

  describe('Owner Booking Flow', () => {
    beforeEach(() => {
      cy.loginAsOwner()
      
      // Mock owner's dogs
      cy.intercept('GET', '/api/dogs', {
        statusCode: 200,
        body: [
          { id: 1, name: 'Bobík', breed: 'Nemecký ovčiak' },
          { id: 2, name: 'Líška', breed: 'Border Collie' }
        ]
      }).as('getOwnerDogs')

      // Mock available sessions
      cy.intercept('GET', '/api/sessions*', {
        statusCode: 200,
        body: [
          {
            id: 1,
            name: 'Základný tréning',
            type: 'individual',
            description: 'Základy poslušnosti pre psov',
            date: '2024-02-15',
            time: '10:00',
            duration: 60,
            price: 35.00,
            max_participants: 1,
            available_spots: 1,
            trainer: {
              id: 1,
              name: 'Mária Trénerová',
              specialization: 'Základný tréning'
            }
          },
          {
            id: 2,
            name: 'Pokročilý tréning',
            type: 'individual',
            description: 'Pokročilé cvičenia a triky',
            date: '2024-02-16',
            time: '14:00',
            duration: 90,
            price: 50.00,
            max_participants: 1,
            available_spots: 1,
            trainer: {
              id: 1,
              name: 'Mária Trénerová',
              specialization: 'Pokročilý tréning'
            }
          }
        ]
      }).as('getIndividualSessions')
    })

    it('should successfully book an individual session', () => {
      const bookingData = {
        session_id: 1,
        dog_id: 1,
        notes: 'Pes je začiatočník, potrebuje základy'
      }

      cy.intercept('POST', '/api/bookings', {
        statusCode: 201,
        body: {
          id: 1,
          status: 'pending',
          ...bookingData,
          session: {
            id: 1,
            name: 'Základný tréning',
            date: '2024-02-15T10:00:00Z'
          }
        }
      }).as('createBooking')

      cy.visit('/sessions')
      cy.waitForApiCall('@getIndividualSessions')

      // Find and book the session
      cy.getByDataCy('session-card-1').should('be.visible')
      cy.getByDataCy('session-card-1').contains('Základný tréning').should('exist')
      cy.getByDataCy('session-card-1').findByDataCy('book-session-button').click()

      // Booking modal should open
      cy.getByDataCy('booking-modal').should('be.visible')
      cy.getByDataCy('session-name').should('contain', 'Základný tréning')
      cy.getByDataCy('session-price').should('contain', '35.00 €')

      // Select dog
      cy.getByDataCy('dog-select').select('1') // Bobík
      
      // Add notes
      cy.getByDataCy('booking-notes-input').type(bookingData.notes)

      // Confirm booking
      cy.getByDataCy('confirm-booking-button').click()

      cy.waitForApiCall('@createBooking')
      cy.contains('Rezervácia bola odoslaná na schválenie').should('exist')
      cy.getByDataCy('booking-modal').should('not.exist')
    })

    it('should show session details before booking', () => {
      cy.visit('/sessions')
      cy.waitForApiCall('@getIndividualSessions')

      cy.getByDataCy('session-card-1').click()
      cy.url().should('include', '/sessions/1')

      // Should show detailed information
      cy.contains('Základný tréning').should('exist')
      cy.contains('Základy poslušnosti pre psov').should('exist')
      cy.contains('15. februára 2024').should('exist')
      cy.contains('10:00').should('exist')
      cy.contains('60 minút').should('exist')
      cy.contains('35.00 €').should('exist')
      cy.contains('Mária Trénerová').should('exist')

      // Should have book button
      cy.getByDataCy('book-session-button').should('exist')
    })

    it('should filter sessions by date and trainer', () => {
      cy.visit('/sessions')
      cy.waitForApiCall('@getIndividualSessions')

      // Filter by date
      cy.getByDataCy('date-filter-input').type('2024-02-15')
      cy.contains('Základný tréning').should('exist')
      cy.contains('Pokročilý tréning').should('not.exist')

      // Clear date filter
      cy.getByDataCy('date-filter-input').clear()
      
      // Filter by trainer
      cy.getByDataCy('trainer-filter-select').select('1')
      cy.contains('Základný tréning').should('exist')
      cy.contains('Pokročilý tréning').should('exist')
    })

    it('should require dog selection for booking', () => {
      cy.visit('/sessions')
      cy.waitForApiCall('@getIndividualSessions')

      cy.getByDataCy('session-card-1').findByDataCy('book-session-button').click()
      cy.getByDataCy('confirm-booking-button').click()

      cy.contains('Musíte vybrať psa').should('exist')
      cy.getByDataCy('booking-modal').should('be.visible')
    })

    it('should handle booking errors', () => {
      cy.intercept('POST', '/api/bookings', {
        statusCode: 422,
        body: {
          message: 'Termín už nie je dostupný',
          errors: {
            session_id: ['Táto session už je plne obsadená']
          }
        }
      }).as('bookingError')

      cy.visit('/sessions')
      cy.waitForApiCall('@getIndividualSessions')

      cy.getByDataCy('session-card-1').findByDataCy('book-session-button').click()
      cy.getByDataCy('dog-select').select('1')
      cy.getByDataCy('confirm-booking-button').click()

      cy.waitForApiCall('@bookingError')
      cy.contains('Táto session už je plne obsadená').should('exist')
    })

    it('should show booking confirmation with payment info', () => {
      const bookingData = {
        id: 1,
        session_id: 1,
        dog_id: 1,
        status: 'pending',
        notes: 'Test notes'
      }

      cy.intercept('POST', '/api/bookings', {
        statusCode: 201,
        body: {
          ...bookingData,
          session: {
            id: 1,
            name: 'Základný tréning',
            price: 35.00,
            date: '2024-02-15T10:00:00Z'
          },
          payment_info: {
            total: 35.00,
            payment_method: 'cash',
            due_date: '2024-02-15'
          }
        }
      }).as('createBookingWithPayment')

      cy.visit('/sessions')
      cy.waitForApiCall('@getIndividualSessions')

      cy.getByDataCy('session-card-1').findByDataCy('book-session-button').click()
      cy.getByDataCy('dog-select').select('1')
      cy.getByDataCy('booking-notes-input').type('Test notes')
      cy.getByDataCy('confirm-booking-button').click()

      cy.waitForApiCall('@createBookingWithPayment')
      
      // Should show confirmation details
      cy.contains('Rezervácia potvrdená').should('exist')
      cy.contains('35.00 €').should('exist')
      cy.contains('Platba pri vstupe').should('exist')
      cy.contains('15. február 2024').should('exist')
    })
  })

  describe('Owner Booking Management', () => {
    beforeEach(() => {
      cy.loginAsOwner()

      // Mock owner's bookings
      cy.intercept('GET', '/api/bookings*', {
        statusCode: 200,
        body: [
          {
            id: 1,
            status: 'pending',
            notes: 'Pes je začiatočník',
            created_at: '2024-01-20T10:00:00Z',
            session: {
              id: 1,
              name: 'Základný tréning',
              date: '2024-02-15T10:00:00Z',
              price: 35.00,
              trainer: {
                name: 'Mária Trénerová'
              }
            },
            dog: {
              id: 1,
              name: 'Bobík'
            }
          },
          {
            id: 2,
            status: 'confirmed',
            notes: 'Pokračovanie v tréningu',
            created_at: '2024-01-21T14:00:00Z',
            session: {
              id: 2,
              name: 'Pokročilý tréning',
              date: '2024-02-20T14:00:00Z',
              price: 50.00,
              trainer: {
                name: 'Mária Trénerová'
              }
            },
            dog: {
              id: 1,
              name: 'Bobík'
            }
          }
        ]
      }).as('getOwnerBookings')
    })

    it('should display owner\'s bookings with correct status', () => {
      cy.visit('/bookings')
      cy.waitForApiCall('@getOwnerBookings')

      // Should show both bookings
      cy.contains('Základný tréning').should('exist')
      cy.contains('Pokročilý tréning').should('exist')

      // Check status badges
      cy.getByDataCy('booking-1').findByDataCy('status-badge').should('contain', 'Čaká na schválenie')
      cy.getByDataCy('booking-2').findByDataCy('status-badge').should('contain', 'Potvrdená')

      // Check other details
      cy.contains('Bobík').should('exist')
      cy.contains('Mária Trénerová').should('exist')
      cy.contains('35.00 €').should('exist')
      cy.contains('50.00 €').should('exist')
    })

    it('should allow owner to cancel pending booking', () => {
      cy.intercept('POST', '/api/bookings/1/cancel', {
        statusCode: 200,
        body: {
          id: 1,
          status: 'cancelled',
          cancellation_reason: 'Zmenené plány'
        }
      }).as('cancelBooking')

      cy.visit('/bookings')
      cy.waitForApiCall('@getOwnerBookings')

      cy.getByDataCy('booking-1').findByDataCy('cancel-booking-button').click()
      
      // Cancel modal should open
      cy.getByDataCy('cancel-modal').should('be.visible')
      cy.getByDataCy('cancel-reason-input').type('Zmenené plány')
      cy.getByDataCy('confirm-cancel-button').click()

      cy.waitForApiCall('@cancelBooking')
      cy.contains('Rezervácia bola zrušená').should('exist')
    })

    it('should show reschedule option for confirmed bookings', () => {
      // Mock available reschedule options
      cy.intercept('GET', '/api/bookings/2/reschedule-options', {
        statusCode: 200,
        body: [
          {
            session_id: 3,
            name: 'Pokročilý tréning',
            date: '2024-02-25T14:00:00Z',
            available_spots: 1
          },
          {
            session_id: 4,
            name: 'Pokročilý tréning',
            date: '2024-02-27T10:00:00Z',
            available_spots: 1
          }
        ]
      }).as('getRescheduleOptions')

      cy.intercept('POST', '/api/bookings/2/reschedule', {
        statusCode: 200,
        body: {
          id: 2,
          session_id: 3,
          status: 'pending',
          message: 'Žiadosť o preloženie odoslaná'
        }
      }).as('rescheduleBooking')

      cy.visit('/bookings')
      cy.waitForApiCall('@getOwnerBookings')

      cy.getByDataCy('booking-2').findByDataCy('reschedule-button').click()
      cy.waitForApiCall('@getRescheduleOptions')

      // Reschedule modal should show options
      cy.getByDataCy('reschedule-modal').should('be.visible')
      cy.contains('25. február 2024').should('exist')
      cy.contains('27. február 2024').should('exist')

      // Select new date
      cy.getByDataCy('reschedule-option-3').click()
      cy.getByDataCy('reschedule-reason-input').type('Rodinná udalosť')
      cy.getByDataCy('confirm-reschedule-button').click()

      cy.waitForApiCall('@rescheduleBooking')
      cy.contains('Žiadosť o preloženie odoslaná').should('exist')
    })

    it('should filter bookings by status and date', () => {
      cy.visit('/bookings')
      cy.waitForApiCall('@getOwnerBookings')

      // Filter by status
      cy.getByDataCy('status-filter-select').select('pending')
      cy.contains('Základný tréning').should('exist')
      cy.contains('Pokročilý tréning').should('not.exist')

      // Filter by confirmed
      cy.getByDataCy('status-filter-select').select('confirmed')
      cy.contains('Pokročilý tréning').should('exist')
      cy.contains('Základný tréning').should('not.exist')

      // Clear filter
      cy.getByDataCy('status-filter-select').select('all')
      cy.contains('Základný tréning').should('exist')
      cy.contains('Pokročilý tréning').should('exist')
    })
  })

  describe('Trainer Approval Flow', () => {
    beforeEach(() => {
      cy.loginAsTrainer()

      // Mock pending bookings for trainer
      cy.intercept('GET', '/api/trainer/bookings*', {
        statusCode: 200,
        body: [
          {
            id: 1,
            status: 'pending',
            notes: 'Pes je začiatočník, potrebuje základy',
            created_at: '2024-01-20T10:00:00Z',
            session: {
              id: 1,
              name: 'Základný tréning',
              date: '2024-02-15T10:00:00Z',
              duration: 60
            },
            dog: {
              id: 1,
              name: 'Bobík',
              breed: 'Nemecký ovčiak',
              age: 3,
              medical_info: 'Všetky očkovania aktuálne'
            },
            owner: {
              id: 1,
              name: 'Ján Novák',
              email: 'jan.novak@test.com',
              phone: '+421 901 234 567'
            }
          },
          {
            id: 2,
            status: 'pending',
            notes: 'Pes má problém s agresivitou',
            created_at: '2024-01-21T11:00:00Z',
            session: {
              id: 2,
              name: 'Behaviorálna terapia',
              date: '2024-02-16T14:00:00Z',
              duration: 90
            },
            dog: {
              id: 2,
              name: 'Rex',
              breed: 'Pitbull',
              age: 5,
              medical_info: 'Liečba za behaviorálne problémy'
            },
            owner: {
              id: 2,
              name: 'Anna Nováková',
              email: 'anna.novakova@test.com',
              phone: '+421 905 567 890'
            }
          }
        ]
      }).as('getTrainerBookings')
    })

    it('should display pending bookings for trainer review', () => {
      cy.visit('/trainer/bookings')
      cy.waitForApiCall('@getTrainerBookings')

      // Should show pending bookings
      cy.contains('Čakajúce na schválenie').should('exist')
      cy.getByDataCy('booking-1').should('exist')
      cy.getByDataCy('booking-2').should('exist')

      // Check booking details
      cy.contains('Bobík').should('exist')
      cy.contains('Nemecký ovčiak').should('exist')
      cy.contains('Ján Novák').should('exist')
      cy.contains('Pes je začiatočník').should('exist')
    })

    it('should approve a booking request', () => {
      cy.intercept('POST', '/api/trainer/bookings/1/approve', {
        statusCode: 200,
        body: {
          id: 1,
          status: 'confirmed',
          approved_at: new Date().toISOString(),
          trainer_notes: 'Schválené - vhodné pre začiatočníka'
        }
      }).as('approveBooking')

      cy.visit('/trainer/bookings')
      cy.waitForApiCall('@getTrainerBookings')

      cy.getByDataCy('booking-1').findByDataCy('approve-button').click()
      
      // Approval modal should open
      cy.getByDataCy('approval-modal').should('be.visible')
      cy.getByDataCy('trainer-notes-input').type('Schválené - vhodné pre začiatočníka')
      cy.getByDataCy('confirm-approval-button').click()

      cy.waitForApiCall('@approveBooking')
      cy.contains('Rezervácia bola schválená').should('exist')
    })

    it('should reject a booking request with reason', () => {
      cy.intercept('POST', '/api/trainer/bookings/2/reject', {
        statusCode: 200,
        body: {
          id: 2,
          status: 'rejected',
          rejected_at: new Date().toISOString(),
          rejection_reason: 'Pes vyžaduje špecializovanú behaviorálnu terapiu'
        }
      }).as('rejectBooking')

      cy.visit('/trainer/bookings')
      cy.waitForApiCall('@getTrainerBookings')

      cy.getByDataCy('booking-2').findByDataCy('reject-button').click()
      
      // Rejection modal should open
      cy.getByDataCy('rejection-modal').should('be.visible')
      cy.getByDataCy('rejection-reason-input').type('Pes vyžaduje špecializovanú behaviorálnu terapiu')
      cy.getByDataCy('alternative-suggestions-input').type('Odporučujem kontaktovať špecializovaného behaviorálneho trénera')
      cy.getByDataCy('confirm-rejection-button').click()

      cy.waitForApiCall('@rejectBooking')
      cy.contains('Rezervácia bola zamietnutá').should('exist')
    })

    it('should view detailed booking information', () => {
      cy.intercept('GET', '/api/trainer/bookings/1', {
        statusCode: 200,
        body: {
          id: 1,
          status: 'pending',
          notes: 'Pes je začiatočník, potrebuje základy',
          session: {
            id: 1,
            name: 'Základný tréning',
            date: '2024-02-15T10:00:00Z',
            location: 'Tréningové centrum'
          },
          dog: {
            id: 1,
            name: 'Bobík',
            breed: 'Nemecký ovčiak',
            age: 3,
            size: 'large',
            description: 'Priateľský a aktívny pes',
            medical_info: 'Všetky očkovania aktuálne',
            photo_url: 'https://example.com/photos/bobik.jpg'
          },
          owner: {
            id: 1,
            name: 'Ján Novák',
            email: 'jan.novak@test.com',
            phone: '+421 901 234 567',
            previous_bookings_count: 3
          }
        }
      }).as('getBookingDetails')

      cy.visit('/trainer/bookings')
      cy.waitForApiCall('@getTrainerBookings')

      cy.getByDataCy('booking-1').click()
      cy.waitForApiCall('@getBookingDetails')

      cy.url().should('include', '/trainer/bookings/1')
      
      // Should show detailed information
      cy.contains('Bobík').should('exist')
      cy.contains('Nemecký ovčiak').should('exist')
      cy.contains('3 roky').should('exist')
      cy.contains('Priateľský a aktívny pes').should('exist')
      cy.contains('Všetky očkovania aktuálne').should('exist')
      cy.contains('Ján Novák').should('exist')
      cy.contains('3 predchádzajúce rezervácie').should('exist')
    })

    it('should filter bookings by status and date', () => {
      cy.visit('/trainer/bookings')
      cy.waitForApiCall('@getTrainerBookings')

      // Filter by status
      cy.getByDataCy('status-filter-select').select('pending')
      cy.getByDataCy('booking-1').should('exist')
      cy.getByDataCy('booking-2').should('exist')

      // Filter by date range
      cy.getByDataCy('date-from-input').type('2024-02-15')
      cy.getByDataCy('date-to-input').type('2024-02-15')
      cy.getByDataCy('apply-filter-button').click()

      cy.getByDataCy('booking-1').should('exist')
      cy.getByDataCy('booking-2').should('not.exist')
    })

    it('should bulk approve multiple bookings', () => {
      cy.intercept('POST', '/api/trainer/bookings/bulk-approve', {
        statusCode: 200,
        body: {
          approved_count: 2,
          message: '2 rezervácie boli schválené'
        }
      }).as('bulkApprove')

      cy.visit('/trainer/bookings')
      cy.waitForApiCall('@getTrainerBookings')

      // Select multiple bookings
      cy.getByDataCy('booking-1').findByDataCy('select-checkbox').check()
      cy.getByDataCy('booking-2').findByDataCy('select-checkbox').check()

      cy.getByDataCy('bulk-actions-button').click()
      cy.getByDataCy('bulk-approve-button').click()

      cy.getByDataCy('bulk-approval-modal').should('be.visible')
      cy.getByDataCy('bulk-trainer-notes-input').type('Všetky schválené - vhodné pre tréning')
      cy.getByDataCy('confirm-bulk-approval-button').click()

      cy.waitForApiCall('@bulkApprove')
      cy.contains('2 rezervácie boli schválené').should('exist')
    })
  })

  describe('Notification System', () => {
    it('should send notification when booking is approved', () => {
      cy.loginAsOwner()

      // Mock notification
      cy.intercept('GET', '/api/notifications', {
        statusCode: 200,
        body: [
          {
            id: 1,
            type: 'booking_approved',
            title: 'Rezervácia schválená',
            message: 'Vaša rezervácia na Základný tréning bola schválená',
            created_at: '2024-01-20T15:00:00Z',
            read_at: null
          }
        ]
      }).as('getNotifications')

      cy.visit('/dashboard')
      cy.getByDataCy('notifications-bell').click()
      cy.waitForApiCall('@getNotifications')

      cy.contains('Rezervácia schválená').should('exist')
      cy.contains('Základný tréning bola schválená').should('exist')
    })

    it('should send notification when booking is rejected', () => {
      cy.loginAsOwner()

      cy.intercept('GET', '/api/notifications', {
        statusCode: 200,
        body: [
          {
            id: 2,
            type: 'booking_rejected',
            title: 'Rezervácia zamietnutá',
            message: 'Vaša rezervácia na Behaviorálny tréning bola zamietnutá',
            created_at: '2024-01-20T16:00:00Z',
            read_at: null,
            data: {
              rejection_reason: 'Pes vyžaduje špecializovanú terapiu'
            }
          }
        ]
      }).as('getRejectionNotifications')

      cy.visit('/dashboard')
      cy.getByDataCy('notifications-bell').click()
      cy.waitForApiCall('@getRejectionNotifications')

      cy.contains('Rezervácia zamietnutá').should('exist')
      cy.contains('Behaviorálny tréning bola zamietnutá').should('exist')
    })
  })
}) 