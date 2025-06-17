describe('Daycare Schedule & Auto-Generation Flow', () => {
  beforeEach(() => {
    cy.cleanupTestData()
  })

  describe('Daycare Schedule Creation (Admin/Trainer)', () => {
    beforeEach(() => {
      cy.loginAsTrainer()
    })

    it('should create a new daycare schedule', () => {
      const scheduleData = {
        name: 'Denná starostlivosť',
        description: 'Celodenná starostlivosť o psov s hrami a aktivitami',
        type: 'daycare',
        start_date: '2024-02-19',
        end_date: '2024-02-23',
        days_of_week: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        start_time: '08:00',
        end_time: '18:00',
        max_capacity: 15,
        price_per_day: 30.00,
        price_per_hour: 5.00,
        location: 'Hlavná budova - denná miestnosť'
      }

      cy.intercept('POST', '/api/daycare/schedules', {
        statusCode: 201,
        body: {
          id: 1,
          ...scheduleData,
          sessions_created: 5,
          message: 'Denný plán vytvorený s 5 sessionmi'
        }
      }).as('createDaycareSchedule')

      cy.visit('/trainer/daycare/create')

      // Fill schedule form
      cy.getByDataCy('schedule-name-input').type(scheduleData.name)
      cy.getByDataCy('schedule-description-input').type(scheduleData.description)
      cy.selectDate('[data-cy=start-date-input]', scheduleData.start_date)
      cy.selectDate('[data-cy=end-date-input]', scheduleData.end_date)
      
      // Select weekdays
      scheduleData.days_of_week.forEach(day => {
        cy.getByDataCy(`day-${day}-checkbox`).check()
      })

      cy.getByDataCy('start-time-input').type(scheduleData.start_time)
      cy.getByDataCy('end-time-input').type(scheduleData.end_time)
      cy.getByDataCy('max-capacity-input').type(scheduleData.max_capacity.toString())
      cy.getByDataCy('price-per-day-input').type(scheduleData.price_per_day.toString())
      cy.getByDataCy('price-per-hour-input').type(scheduleData.price_per_hour.toString())
      cy.getByDataCy('location-input').type(scheduleData.location)

      cy.getByDataCy('create-schedule-button').click()
      cy.waitForApiCall('@createDaycareSchedule')

      cy.url().should('include', '/trainer/daycare')
      cy.contains('Denný plán vytvorený s 5 sessionmi').should('exist')
    })

    it('should create recurring daycare schedule', () => {
      const recurringData = {
        name: 'Týždenná denná starostlivosť',
        recurrence_type: 'weekly',
        recurrence_weeks: 12,
        days_of_week: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        start_time: '07:30',
        end_time: '19:00',
        max_capacity: 20
      }

      cy.intercept('POST', '/api/daycare/schedules/recurring', {
        statusCode: 201,
        body: {
          created_sessions: 60,
          message: '60 denných sessions vytvorených na 12 týždňov'
        }
      }).as('createRecurringSchedule')

      cy.visit('/trainer/daycare/create')

      cy.getByDataCy('schedule-name-input').type(recurringData.name)
      cy.getByDataCy('recurring-checkbox').check()
      cy.getByDataCy('recurrence-type-select').select(recurringData.recurrence_type)
      cy.getByDataCy('recurrence-weeks-input').type(recurringData.recurrence_weeks.toString())

      recurringData.days_of_week.forEach(day => {
        cy.getByDataCy(`day-${day}-checkbox`).check()
      })

      cy.getByDataCy('start-time-input').type(recurringData.start_time)
      cy.getByDataCy('end-time-input').type(recurringData.end_time)
      cy.getByDataCy('max-capacity-input').type(recurringData.max_capacity.toString())

      cy.getByDataCy('create-schedule-button').click()
      cy.waitForApiCall('@createRecurringSchedule')

      cy.contains('60 denných sessions vytvorených na 12 týždňov').should('exist')
    })

    it('should validate daycare schedule data', () => {
      cy.visit('/trainer/daycare/create')

      cy.getByDataCy('create-schedule-button').click()

      // Should show validation errors
      cy.contains('Názov je povinný').should('exist')
      cy.contains('Začiatočný dátum je povinný').should('exist')
      cy.contains('Čas začiatku je povinný').should('exist')
      cy.contains('Kapacita je povinná').should('exist')

      // Test invalid time range
      cy.getByDataCy('start-time-input').type('18:00')
      cy.getByDataCy('end-time-input').type('08:00')
      cy.getByDataCy('schedule-name-input').click() // Trigger blur
      cy.contains('Čas ukončenia musí byť po čase začiatku').should('exist')

      // Test invalid capacity
      cy.getByDataCy('max-capacity-input').type('0')
      cy.getByDataCy('schedule-name-input').click()
      cy.contains('Minimálna kapacita je 1').should('exist')

      cy.getByDataCy('max-capacity-input').clear().type('100')
      cy.getByDataCy('schedule-name-input').click()
      cy.contains('Maximálna kapacita je 50').should('exist')
    })
  })

  describe('Daycare Session Auto-Generation', () => {
    beforeEach(() => {
      cy.loginAsTrainer()

      // Mock existing schedule
      cy.intercept('GET', '/api/daycare/schedules/1', {
        statusCode: 200,
        body: {
          id: 1,
          name: 'Denná starostlivosť',
          days_of_week: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
          start_time: '08:00',
          end_time: '18:00',
          max_capacity: 15,
          price_per_day: 30.00,
          status: 'active'
        }
      }).as('getDaycareSchedule')
    })

    it('should auto-generate sessions for next week', () => {
      cy.intercept('POST', '/api/daycare/schedules/1/generate', {
        statusCode: 200,
        body: {
          generated_sessions: [
            {
              id: 101,
              date: '2024-02-26',
              start_time: '08:00',
              end_time: '18:00',
              capacity: 15,
              current_bookings: 0
            },
            {
              id: 102,
              date: '2024-02-27',
              start_time: '08:00',
              end_time: '18:00',
              capacity: 15,
              current_bookings: 0
            },
            {
              id: 103,
              date: '2024-02-28',
              start_time: '08:00',
              end_time: '18:00',
              capacity: 15,
              current_bookings: 0
            },
            {
              id: 104,
              date: '2024-02-29',
              start_time: '08:00',
              end_time: '18:00',
              capacity: 15,
              current_bookings: 0
            },
            {
              id: 105,
              date: '2024-03-01',
              start_time: '08:00',
              end_time: '18:00',
              capacity: 15,
              current_bookings: 0
            }
          ],
          message: '5 denných sessions vygenerovaných pre nasledujúci týždeň'
        }
      }).as('generateSessions')

      cy.visit('/trainer/daycare/schedules/1')
      cy.waitForApiCall('@getDaycareSchedule')

      cy.getByDataCy('generate-sessions-button').click()
      
      // Generation modal
      cy.getByDataCy('generation-modal').should('be.visible')
      cy.getByDataCy('generation-period-select').select('next_week')
      cy.getByDataCy('confirm-generation-button').click()

      cy.waitForApiCall('@generateSessions')
      cy.contains('5 denných sessions vygenerovaných').should('exist')
    })

    it('should auto-generate sessions for custom date range', () => {
      cy.intercept('POST', '/api/daycare/schedules/1/generate', {
        statusCode: 200,
        body: {
          generated_sessions: [],
          sessions_count: 10,
          message: '10 denných sessions vygenerovaných pre vybraný obdobie'
        }
      }).as('generateCustomSessions')

      cy.visit('/trainer/daycare/schedules/1')
      cy.waitForApiCall('@getDaycareSchedule')

      cy.getByDataCy('generate-sessions-button').click()
      cy.getByDataCy('generation-period-select').select('custom')
      
      // Custom date range appears
      cy.selectDate('[data-cy=generation-start-date]', '2024-03-01')
      cy.selectDate('[data-cy=generation-end-date]', '2024-03-15')
      
      cy.getByDataCy('confirm-generation-button').click()
      cy.waitForApiCall('@generateCustomSessions')

      cy.contains('10 denných sessions vygenerovaných').should('exist')
    })

    it('should handle conflicts when generating sessions', () => {
      cy.intercept('POST', '/api/daycare/schedules/1/generate', {
        statusCode: 422,
        body: {
          message: 'Konflikty v rozvrhu',
          conflicts: [
            {
              date: '2024-02-26',
              reason: 'Session už existuje pre tento dátum'
            },
            {
              date: '2024-02-27',
              reason: 'Konflikt s iným rozvrsom'
            }
          ]
        }
      }).as('generateConflicts')

      cy.visit('/trainer/daycare/schedules/1')
      cy.waitForApiCall('@getDaycareSchedule')

      cy.getByDataCy('generate-sessions-button').click()
      cy.getByDataCy('generation-period-select').select('next_week')
      cy.getByDataCy('confirm-generation-button').click()

      cy.waitForApiCall('@generateConflicts')
      
      // Should show conflicts
      cy.contains('Konflikty v rozvrhu').should('exist')
      cy.contains('Session už existuje pre tento dátum').should('exist')
      cy.contains('Konflikt s iným rozvrsom').should('exist')

      // Should offer resolution options
      cy.getByDataCy('resolve-conflicts-button').should('exist')
      cy.getByDataCy('skip-conflicts-button').should('exist')
    })

    it('should bulk edit generated sessions', () => {
      // Mock generated sessions
      cy.intercept('GET', '/api/daycare/schedules/1/sessions', {
        statusCode: 200,
        body: [
          {
            id: 101,
            date: '2024-02-26',
            start_time: '08:00',
            end_time: '18:00',
            capacity: 15,
            current_bookings: 2
          },
          {
            id: 102,
            date: '2024-02-27',
            start_time: '08:00',
            end_time: '18:00',
            capacity: 15,
            current_bookings: 0
          }
        ]
      }).as('getGeneratedSessions')

      cy.intercept('PUT', '/api/daycare/sessions/bulk-edit', {
        statusCode: 200,
        body: {
          updated_sessions: 2,
          message: '2 sessions boli aktualizované'
        }
      }).as('bulkEditSessions')

      cy.visit('/trainer/daycare/schedules/1/sessions')
      cy.waitForApiCall('@getGeneratedSessions')

      // Select sessions for bulk edit
      cy.getByDataCy('session-101').findByDataCy('select-checkbox').check()
      cy.getByDataCy('session-102').findByDataCy('select-checkbox').check()

      cy.getByDataCy('bulk-edit-button').click()
      
      // Bulk edit modal
      cy.getByDataCy('bulk-edit-modal').should('be.visible')
      cy.getByDataCy('bulk-capacity-input').type('20')
      cy.getByDataCy('bulk-price-input').type('35.00')
      cy.getByDataCy('confirm-bulk-edit-button').click()

      cy.waitForApiCall('@bulkEditSessions')
      cy.contains('2 sessions boli aktualizované').should('exist')
    })
  })

  describe('Daycare Booking Flow (Owner)', () => {
    beforeEach(() => {
      cy.loginAsOwner()

      // Mock owner's dogs
      cy.intercept('GET', '/api/dogs', {
        statusCode: 200,
        body: [
          {
            id: 1,
            name: 'Bobík',
            breed: 'Nemecký ovčiak',
            age: 3,
            size: 'large',
            daycare_approved: true
          },
          {
            id: 2,
            name: 'Líška',
            breed: 'Border Collie',
            age: 1,
            size: 'medium',
            daycare_approved: false
          }
        ]
      }).as('getOwnerDogs')

      // Mock available daycare sessions
      cy.intercept('GET', '/api/daycare/sessions*', {
        statusCode: 200,
        body: [
          {
            id: 101,
            date: '2024-02-26',
            start_time: '08:00',
            end_time: '18:00',
            capacity: 15,
            current_bookings: 8,
            available_spots: 7,
            price_per_day: 30.00,
            price_per_hour: 5.00,
            location: 'Hlavná budova'
          },
          {
            id: 102,
            date: '2024-02-27',
            start_time: '08:00',
            end_time: '18:00',
            capacity: 15,
            current_bookings: 15,
            available_spots: 0,
            price_per_day: 30.00,
            price_per_hour: 5.00,
            location: 'Hlavná budova'
          }
        ]
      }).as('getDaycareSessions')
    })

    it('should book daycare session for full day', () => {
      const bookingData = {
        session_id: 101,
        dog_id: 1,
        booking_type: 'full_day',
        drop_off_time: '08:00',
        pick_up_time: '18:00',
        special_instructions: 'Pes má alergiu na kurčacie mäso'
      }

      cy.intercept('POST', '/api/daycare/bookings', {
        statusCode: 201,
        body: {
          id: 1,
          ...bookingData,
          total_price: 30.00,
          status: 'confirmed',
          session: {
            id: 101,
            date: '2024-02-26'
          }
        }
      }).as('bookDaycare')

      cy.visit('/daycare')
      cy.waitForApiCall('@getDaycareSessions')

      cy.getByDataCy('session-card-101').should('be.visible')
      cy.getByDataCy('session-card-101').contains('8/15 obsadených').should('exist')
      cy.getByDataCy('session-card-101').findByDataCy('book-daycare-button').click()

      // Booking modal
      cy.getByDataCy('daycare-booking-modal').should('be.visible')
      
      // Select dog
      cy.getByDataCy('dog-select').select('1') // Bobík
      
      // Select full day
      cy.getByDataCy('booking-type-select').select('full_day')
      
      // Times should be set automatically
      cy.getByDataCy('drop-off-time-display').should('contain', '08:00')
      cy.getByDataCy('pick-up-time-display').should('contain', '18:00')
      cy.getByDataCy('total-price-display').should('contain', '30.00 €')

      // Add special instructions
      cy.getByDataCy('special-instructions-input').type(bookingData.special_instructions)

      cy.getByDataCy('confirm-daycare-booking-button').click()
      cy.waitForApiCall('@bookDaycare')

      cy.contains('Denná starostlivosť bola rezervovaná').should('exist')
    })

    it('should book daycare session for custom hours', () => {
      const customBookingData = {
        session_id: 101,
        dog_id: 1,
        booking_type: 'custom_hours',
        drop_off_time: '10:00',
        pick_up_time: '15:00',
        total_hours: 5
      }

      cy.intercept('POST', '/api/daycare/bookings', {
        statusCode: 201,
        body: {
          id: 2,
          ...customBookingData,
          total_price: 25.00, // 5 hours * 5€/hour
          status: 'confirmed'
        }
      }).as('bookCustomHours')

      cy.visit('/daycare')
      cy.waitForApiCall('@getDaycareSessions')

      cy.getByDataCy('session-card-101').findByDataCy('book-daycare-button').click()
      
      cy.getByDataCy('dog-select').select('1')
      cy.getByDataCy('booking-type-select').select('custom_hours')

      // Custom time picker appears
      cy.getByDataCy('custom-drop-off-time').type('10:00')
      cy.getByDataCy('custom-pick-up-time').type('15:00')
      
      // Price should update automatically
      cy.getByDataCy('hours-display').should('contain', '5 hodín')
      cy.getByDataCy('total-price-display').should('contain', '25.00 €')

      cy.getByDataCy('confirm-daycare-booking-button').click()
      cy.waitForApiCall('@bookCustomHours')

      cy.contains('Denná starostlivosť bola rezervovaná').should('exist')
    })

    it('should prevent booking if dog not approved for daycare', () => {
      cy.visit('/daycare')
      cy.waitForApiCall('@getDaycareSessions')

      cy.getByDataCy('session-card-101').findByDataCy('book-daycare-button').click()
      
      cy.getByDataCy('dog-select').select('2') // Líška (not approved)

      // Should show warning
      cy.getByDataCy('approval-warning').should('be.visible')
      cy.contains('Líška nie je schválená pre dennú starostlivosť').should('exist')
      cy.getByDataCy('approval-process-link').should('exist')
      
      // Booking button should be disabled
      cy.getByDataCy('confirm-daycare-booking-button').should('be.disabled')
    })

    it('should show daycare session full state', () => {
      cy.visit('/daycare')
      cy.waitForApiCall('@getDaycareSessions')

      // Full session should show properly
      cy.getByDataCy('session-card-102').should('contain', '15/15 obsadených')
      cy.getByDataCy('session-card-102').should('contain', 'Plne obsadené')
      cy.getByDataCy('session-card-102').findByDataCy('book-daycare-button').should('be.disabled')
      
      // Should show waitlist option
      cy.getByDataCy('session-card-102').findByDataCy('join-waitlist-button').should('exist')
    })

    it('should book recurring daycare for multiple days', () => {
      cy.intercept('POST', '/api/daycare/bookings/recurring', {
        statusCode: 201,
        body: {
          bookings_created: 5,
          total_price: 150.00,
          message: '5 denných rezervácií vytvorených'
        }
      }).as('bookRecurringDaycare')

      cy.visit('/daycare')
      cy.waitForApiCall('@getDaycareSessions')

      cy.getByDataCy('book-recurring-button').click()
      
      // Recurring booking modal
      cy.getByDataCy('recurring-booking-modal').should('be.visible')
      cy.getByDataCy('dog-select').select('1')
      
      // Select days
      cy.getByDataCy('recurring-monday-checkbox').check()
      cy.getByDataCy('recurring-tuesday-checkbox').check()
      cy.getByDataCy('recurring-wednesday-checkbox').check()
      cy.getByDataCy('recurring-thursday-checkbox').check()
      cy.getByDataCy('recurring-friday-checkbox').check()
      
      // Select period
      cy.selectDate('[data-cy=recurring-start-date]', '2024-02-26')
      cy.selectDate('[data-cy=recurring-end-date]', '2024-03-01')
      
      cy.getByDataCy('booking-type-select').select('full_day')
      
      // Should show summary
      cy.getByDataCy('recurring-summary').should('contain', '5 dní')
      cy.getByDataCy('recurring-total').should('contain', '150.00 €')

      cy.getByDataCy('confirm-recurring-booking-button').click()
      cy.waitForApiCall('@bookRecurringDaycare')

      cy.contains('5 denných rezervácií vytvorených').should('exist')
    })
  })

  describe('Daycare Booking Management', () => {
    beforeEach(() => {
      cy.loginAsOwner()

      // Mock owner's daycare bookings
      cy.intercept('GET', '/api/daycare/bookings*', {
        statusCode: 200,
        body: [
          {
            id: 1,
            status: 'confirmed',
            booking_type: 'full_day',
            drop_off_time: '08:00',
            pick_up_time: '18:00',
            total_price: 30.00,
            special_instructions: 'Alergia na kurčacie mäso',
            session: {
              id: 101,
              date: '2024-02-26',
              location: 'Hlavná budova'
            },
            dog: {
              id: 1,
              name: 'Bobík'
            }
          },
          {
            id: 2,
            status: 'confirmed',
            booking_type: 'custom_hours',
            drop_off_time: '10:00',
            pick_up_time: '15:00',
            total_price: 25.00,
            session: {
              id: 102,
              date: '2024-02-27',
              location: 'Hlavná budova'
            },
            dog: {
              id: 1,
              name: 'Bobík'
            }
          }
        ]
      }).as('getDaycareBookings')
    })

    it('should display owner\'s daycare bookings', () => {
      cy.visit('/daycare/bookings')
      cy.waitForApiCall('@getDaycareBookings')

      // Should show bookings
      cy.getByDataCy('booking-1').should('exist')
      cy.getByDataCy('booking-2').should('exist')

      // Check booking details
      cy.contains('26. február 2024').should('exist')
      cy.contains('27. február 2024').should('exist')
      cy.contains('Bobík').should('exist')
      cy.contains('30.00 €').should('exist')
      cy.contains('25.00 €').should('exist')
      cy.contains('Celý deň').should('exist')
      cy.contains('5 hodín').should('exist')
    })

    it('should modify daycare booking times', () => {
      cy.intercept('PUT', '/api/daycare/bookings/2', {
        statusCode: 200,
        body: {
          id: 2,
          drop_off_time: '09:00',
          pick_up_time: '16:00',
          total_price: 35.00,
          message: 'Časy boli aktualizované'
        }
      }).as('modifyBooking')

      cy.visit('/daycare/bookings')
      cy.waitForApiCall('@getDaycareBookings')

      cy.getByDataCy('booking-2').findByDataCy('modify-times-button').click()
      
      // Modify modal
      cy.getByDataCy('modify-modal').should('be.visible')
      cy.getByDataCy('new-drop-off-time').clear().type('09:00')
      cy.getByDataCy('new-pick-up-time').clear().type('16:00')
      
      // Price should update
      cy.getByDataCy('new-total-price').should('contain', '35.00 €')
      
      cy.getByDataCy('confirm-modify-button').click()
      cy.waitForApiCall('@modifyBooking')

      cy.contains('Časy boli aktualizované').should('exist')
    })

    it('should cancel daycare booking', () => {
      cy.intercept('POST', '/api/daycare/bookings/1/cancel', {
        statusCode: 200,
        body: {
          id: 1,
          status: 'cancelled',
          refund_amount: 30.00,
          message: 'Rezervácia zrušená'
        }
      }).as('cancelDaycareBooking')

      cy.visit('/daycare/bookings')
      cy.waitForApiCall('@getDaycareBookings')

      cy.getByDataCy('booking-1').findByDataCy('cancel-booking-button').click()
      
      cy.getByDataCy('cancel-modal').should('be.visible')
      cy.getByDataCy('cancel-reason-input').type('Rodinná udalosť')
      cy.getByDataCy('confirm-cancel-button').click()

      cy.waitForApiCall('@cancelDaycareBooking')
      cy.contains('Rezervácia zrušená').should('exist')
      cy.contains('Refund: 30.00 €').should('exist')
    })
  })

  describe('Daycare Staff Management', () => {
    beforeEach(() => {
      cy.loginAsTrainer()
    })

    it('should manage daily attendance', () => {
      // Mock daily attendance
      cy.intercept('GET', '/api/daycare/sessions/101/attendance', {
        statusCode: 200,
        body: [
          {
            booking_id: 1,
            dog: { id: 1, name: 'Bobík' },
            owner: { name: 'Ján Novák', phone: '+421 901 234 567' },
            drop_off_time: '08:00',
            pick_up_time: '18:00',
            actual_drop_off: null,
            actual_pick_up: null,
            status: 'scheduled'
          },
          {
            booking_id: 2,
            dog: { id: 2, name: 'Rex' },
            owner: { name: 'Anna Nováková', phone: '+421 905 567 890' },
            drop_off_time: '09:00',
            pick_up_time: '16:00',
            actual_drop_off: '2024-02-26T09:15:00Z',
            actual_pick_up: null,
            status: 'checked_in'
          }
        ]
      }).as('getDailyAttendance')

      cy.intercept('POST', '/api/daycare/attendance/check-in', {
        statusCode: 200,
        body: {
          booking_id: 1,
          actual_drop_off: new Date().toISOString(),
          message: 'Bobík zaregistrovaný'
        }
      }).as('checkInDog')

      cy.visit('/trainer/daycare/sessions/101/attendance')
      cy.waitForApiCall('@getDailyAttendance')

      // Should show attendance list
      cy.contains('Bobík').should('exist')
      cy.contains('Rex').should('exist')
      cy.getByDataCy('attendance-1').should('contain', 'Očakáva sa')
      cy.getByDataCy('attendance-2').should('contain', 'Prítomný')

      // Check in dog
      cy.getByDataCy('attendance-1').findByDataCy('check-in-button').click()
      cy.waitForApiCall('@checkInDog')

      cy.contains('Bobík zaregistrovaný').should('exist')
    })

    it('should manage emergency contacts and medical info', () => {
      cy.intercept('GET', '/api/daycare/sessions/101/emergency-info', {
        statusCode: 200,
        body: [
          {
            dog: { id: 1, name: 'Bobík' },
            owner: {
              name: 'Ján Novák',
              phone: '+421 901 234 567',
              emergency_contact: '+421 902 345 678'
            },
            medical_info: 'Alergia na kurčacie mäso',
            veterinarian: 'MVDr. Petra Nová, +421 903 456 789',
            medications: 'Žiadne'
          }
        ]
      }).as('getEmergencyInfo')

      cy.visit('/trainer/daycare/sessions/101/emergency')
      cy.waitForApiCall('@getEmergencyInfo')

      cy.contains('Bobík').should('exist')
      cy.contains('Alergia na kurčacie mäso').should('exist')
      cy.contains('MVDr. Petra Nová').should('exist')
      cy.contains('+421 902 345 678').should('exist')
    })
  })
}) 