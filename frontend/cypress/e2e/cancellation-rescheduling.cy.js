describe('Cancellation & Rescheduling Flow', () => {
  beforeEach(() => {
    cy.cleanupTestData()
  })

  describe('Booking Cancellation (Owner)', () => {
    beforeEach(() => {
      cy.loginAsOwner()

      // Mock owner's bookings
      cy.intercept('GET', '/api/bookings*', {
        statusCode: 200,
        body: [
          {
            id: 1,
            status: 'confirmed',
            created_at: '2024-01-15T10:00:00Z',
            session: {
              id: 1,
              name: 'Základný tréning',
              date: '2024-02-20T10:00:00Z',
              type: 'individual',
              price: 35.00,
              trainer: {
                id: 1,
                name: 'Mária Trénerová'
              }
            },
            dog: {
              id: 1,
              name: 'Bobík'
            },
            can_cancel: true,
            can_reschedule: true,
            cancellation_policy: {
              free_cancellation_hours: 24,
              partial_refund_hours: 12,
              no_refund_hours: 2
            }
          },
          {
            id: 2,
            status: 'confirmed',
            created_at: '2024-01-16T14:00:00Z',
            session: {
              id: 2,
              name: 'Skupinový tréning',
              date: '2024-02-21T16:00:00Z',
              type: 'group',
              price: 25.00,
              current_participants: 4,
              max_participants: 6
            },
            dog: {
              id: 1,
              name: 'Bobík'
            },
            can_cancel: true,
            can_reschedule: false // Group session, limited rescheduling
          }
        ]
      }).as('getOwnerBookings')
    })

    it('should cancel booking with full refund (24+ hours notice)', () => {
      const cancellationData = {
        booking_id: 1,
        reason: 'family_emergency',
        details: 'Rodinná núdzová situácia, nemôžeme sa zúčastniť'
      }

      cy.intercept('POST', '/api/bookings/1/cancel', {
        statusCode: 200,
        body: {
          id: 1,
          status: 'cancelled',
          cancellation_reason: cancellationData.reason,
          refund_amount: 35.00,
          refund_percentage: 100,
          refund_processing_time: '3-5 pracovných dní',
          cancellation_fee: 0
        }
      }).as('cancelBookingFullRefund')

      cy.visit('/bookings')
      cy.waitForApiCall('@getOwnerBookings')

      cy.getByDataCy('booking-1').findByDataCy('cancel-booking-button').click()
      
      // Cancellation modal
      cy.getByDataCy('cancellation-modal').should('be.visible')
      
      // Should show cancellation policy
      cy.contains('Zrušenie zadarmo: 24+ hodín vopred').should('exist')
      cy.contains('Čiastočný refund: 12-24 hodín vopred').should('exist')
      cy.contains('Bez refundu: menej ako 2 hodiny vopred').should('exist')

      // Current refund calculation
      cy.getByDataCy('refund-calculator').should('contain', '100% refund (35.00 €)')
      cy.getByDataCy('cancellation-fee').should('contain', 'Poplatok za zrušenie: 0 €')

      // Fill cancellation form
      cy.getByDataCy('cancellation-reason-select').select(cancellationData.reason)
      cy.getByDataCy('cancellation-details-input').type(cancellationData.details)

      cy.getByDataCy('confirm-cancellation-button').click()
      cy.waitForApiCall('@cancelBookingFullRefund')

      cy.contains('Rezervácia bola zrušená').should('exist')
      cy.contains('Refund: 35.00 € (100%)').should('exist')
      cy.contains('3-5 pracovných dní').should('exist')
    })

    it('should cancel booking with partial refund (12-24 hours notice)', () => {
      // Mock booking close to session time
      cy.intercept('GET', '/api/bookings/1/cancellation-info', {
        statusCode: 200,
        body: {
          hours_until_session: 18,
          refund_percentage: 50,
          refund_amount: 17.50,
          cancellation_fee: 5.00,
          net_refund: 12.50
        }
      }).as('getCancellationInfo')

      cy.intercept('POST', '/api/bookings/1/cancel', {
        statusCode: 200,
        body: {
          id: 1,
          status: 'cancelled',
          refund_amount: 12.50,
          refund_percentage: 50,
          cancellation_fee: 5.00
        }
      }).as('cancelBookingPartialRefund')

      cy.visit('/bookings')
      cy.waitForApiCall('@getOwnerBookings')

      cy.getByDataCy('booking-1').findByDataCy('cancel-booking-button').click()
      cy.waitForApiCall('@getCancellationInfo')

      // Should show partial refund calculation
      cy.getByDataCy('refund-calculator').should('contain', '50% refund (17.50 €)')
      cy.getByDataCy('cancellation-fee').should('contain', 'Poplatok za zrušenie: 5.00 €')
      cy.getByDataCy('net-refund').should('contain', 'Čistý refund: 12.50 €')

      cy.getByDataCy('cancellation-reason-select').select('schedule_conflict')
      cy.getByDataCy('cancellation-details-input').type('Neočakávaný konflikt v rozvrhu')

      cy.getByDataCy('confirm-cancellation-button').click()
      cy.waitForApiCall('@cancelBookingPartialRefund')

      cy.contains('Rezervácia bola zrušená').should('exist')
      cy.contains('Refund: 12.50 € (čistý)').should('exist')
    })

    it('should cancel booking with no refund (less than 2 hours notice)', () => {
      cy.intercept('GET', '/api/bookings/1/cancellation-info', {
        statusCode: 200,
        body: {
          hours_until_session: 1,
          refund_percentage: 0,
          refund_amount: 0,
          cancellation_fee: 35.00,
          net_refund: 0,
          no_refund_reason: 'Príliš neskoro na zrušenie'
        }
      }).as('getCancellationInfoNoRefund')

      cy.intercept('POST', '/api/bookings/1/cancel', {
        statusCode: 200,
        body: {
          id: 1,
          status: 'cancelled',
          refund_amount: 0,
          cancellation_fee: 35.00
        }
      }).as('cancelBookingNoRefund')

      cy.visit('/bookings')
      cy.waitForApiCall('@getOwnerBookings')

      cy.getByDataCy('booking-1').findByDataCy('cancel-booking-button').click()
      cy.waitForApiCall('@getCancellationInfoNoRefund')

      // Should show no refund warning
      cy.getByDataCy('no-refund-warning').should('be.visible')
      cy.contains('0% refund (0 €)').should('exist')
      cy.contains('Príliš neskoro na zrušenie').should('exist')

      // Should require additional confirmation
      cy.getByDataCy('no-refund-confirmation-checkbox').should('exist')
      cy.getByDataCy('confirm-cancellation-button').should('be.disabled')

      cy.getByDataCy('cancellation-reason-select').select('emergency')
      cy.getByDataCy('cancellation-details-input').type('Akútna zdravotná núdzová situácia')
      cy.getByDataCy('no-refund-confirmation-checkbox').check()

      cy.getByDataCy('confirm-cancellation-button').should('be.enabled')
      cy.getByDataCy('confirm-cancellation-button').click()
      cy.waitForApiCall('@cancelBookingNoRefund')

      cy.contains('Rezervácia bola zrušená').should('exist')
      cy.contains('Bez refundu').should('exist')
    })

    it('should cancel group session booking and handle waitlist', () => {
      cy.intercept('POST', '/api/bookings/2/cancel', {
        statusCode: 200,
        body: {
          id: 2,
          status: 'cancelled',
          refund_amount: 25.00,
          waitlist_notification_sent: true,
          waitlist_position_filled: {
            owner_name: 'Peter N.',
            dog_name: 'Rex'
          }
        }
      }).as('cancelGroupBooking')

      cy.visit('/bookings')
      cy.waitForApiCall('@getOwnerBookings')

      cy.getByDataCy('booking-2').findByDataCy('cancel-booking-button').click()
      
      // Should show group session specific info
      cy.contains('Skupinová session').should('exist')
      cy.contains('4/6 účastníkov').should('exist')
      cy.contains('Vaše miesto môže byť ponúknuté niekomu z čakacej listiny').should('exist')

      cy.getByDataCy('cancellation-reason-select').select('illness')
      cy.getByDataCy('cancellation-details-input').type('Pes je chorý')

      cy.getByDataCy('confirm-cancellation-button').click()
      cy.waitForApiCall('@cancelGroupBooking')

      cy.contains('Rezervácia bola zrušená').should('exist')
      cy.contains('Miesto bolo ponúknuté Peter N. (Rex)').should('exist')
    })

    it('should handle emergency cancellation with special consideration', () => {
      cy.intercept('POST', '/api/bookings/1/emergency-cancel', {
        statusCode: 200,
        body: {
          id: 1,
          status: 'cancelled',
          emergency_approval: true,
          refund_amount: 35.00,
          emergency_refund_reason: 'Schválené kvôli zdravotnej núdzovej situácii'
        }
      }).as('emergencyCancel')

      cy.visit('/bookings')
      cy.waitForApiCall('@getOwnerBookings')

      cy.getByDataCy('booking-1').findByDataCy('cancel-booking-button').click()
      
      cy.getByDataCy('cancellation-reason-select').select('medical_emergency')
      cy.getByDataCy('cancellation-details-input').type('Pes bol zranený a potrebuje okamžitú veterinárnu starostlivosť')
      
      // Emergency documentation upload
      cy.getByDataCy('emergency-documentation-upload').selectFile('cypress/fixtures/vet-report.pdf', { force: true })
      cy.getByDataCy('emergency-contact-input').type('+421 902 123 456')

      cy.getByDataCy('request-emergency-review-button').click()
      cy.waitForApiCall('@emergencyCancel')

      cy.contains('Núdzové zrušenie schválené').should('exist')
      cy.contains('Plný refund udelený').should('exist')
    })
  })

  describe('Booking Rescheduling (Owner)', () => {
    beforeEach(() => {
      cy.loginAsOwner()

      // Mock booking that can be rescheduled
      cy.intercept('GET', '/api/bookings/1', {
        statusCode: 200,
        body: {
          id: 1,
          status: 'confirmed',
          session: {
            id: 1,
            name: 'Základný tréning',
            date: '2024-02-20T10:00:00Z',
            type: 'individual',
            trainer: {
              id: 1,
              name: 'Mária Trénerová'
            }
          },
          can_reschedule: true,
          reschedule_policy: {
            free_reschedule_hours: 48,
            fee_reschedule_hours: 24,
            reschedule_fee: 5.00,
            max_reschedules: 2,
            current_reschedules: 0
          }
        }
      }).as('getBookingForReschedule')

      // Mock available alternative sessions
      cy.intercept('GET', '/api/bookings/1/reschedule-options', {
        statusCode: 200,
        body: [
          {
            session_id: 3,
            name: 'Základný tréning',
            date: '2024-02-22T10:00:00Z',
            trainer: {
              id: 1,
              name: 'Mária Trénerová'
            },
            available: true,
            price_difference: 0
          },
          {
            session_id: 4,
            name: 'Základný tréning',
            date: '2024-02-25T14:00:00Z',
            trainer: {
              id: 1,
              name: 'Mária Trénerová'
            },
            available: true,
            price_difference: 0
          },
          {
            session_id: 5,
            name: 'Pokročilý tréning',
            date: '2024-02-23T16:00:00Z',
            trainer: {
              id: 1,
              name: 'Mária Trénerová'
            },
            available: true,
            price_difference: 15.00
          }
        ]
      }).as('getRescheduleOptions')
    })

    it('should reschedule booking to different date (free reschedule)', () => {
      const rescheduleData = {
        booking_id: 1,
        new_session_id: 3,
        reason: 'schedule_conflict',
        details: 'Konflikt s pracovnými povinnosťami'
      }

      cy.intercept('POST', '/api/bookings/1/reschedule', {
        statusCode: 200,
        body: {
          id: 1,
          old_session_id: 1,
          new_session_id: 3,
          reschedule_fee: 0,
          price_difference: 0,
          total_adjustment: 0,
          new_session: {
            id: 3,
            date: '2024-02-22T10:00:00Z'
          }
        }
      }).as('rescheduleBooking')

      cy.visit('/bookings/1/reschedule')
      cy.waitForApiCall('@getBookingForReschedule')
      cy.waitForApiCall('@getRescheduleOptions')

      // Should show reschedule policy
      cy.contains('Preloženie zadarmo: 48+ hodín vopred').should('exist')
      cy.contains('Poplatok za preloženie: 24-48 hodín vopred (5.00 €)').should('exist')
      cy.contains('Zostávajúce preloženia: 2/2').should('exist')

      // Should show available options
      cy.getByDataCy('reschedule-option-3').should('exist')
      cy.getByDataCy('reschedule-option-4').should('exist')
      cy.getByDataCy('reschedule-option-5').should('exist')

      // Select new date
      cy.getByDataCy('reschedule-option-3').click()
      
      // Should show details
      cy.contains('22. február 2024, 10:00').should('exist')
      cy.contains('Bez dodatočných poplatkov').should('exist')

      // Fill reschedule reason
      cy.getByDataCy('reschedule-reason-select').select(rescheduleData.reason)
      cy.getByDataCy('reschedule-details-input').type(rescheduleData.details)

      cy.getByDataCy('confirm-reschedule-button').click()
      cy.waitForApiCall('@rescheduleBooking')

      cy.contains('Rezervácia bola preložená').should('exist')
      cy.contains('Nový termín: 22. február 2024').should('exist')
      cy.contains('Bez dodatočných poplatkov').should('exist')
    })

    it('should reschedule with fee (24-48 hours notice)', () => {
      // Mock closer to session time
      cy.intercept('GET', '/api/bookings/1/reschedule-fee', {
        statusCode: 200,
        body: {
          hours_until_session: 36,
          reschedule_fee: 5.00,
          can_reschedule: true
        }
      }).as('getRescheduleFee')

      cy.intercept('POST', '/api/bookings/1/reschedule', {
        statusCode: 200,
        body: {
          id: 1,
          reschedule_fee: 5.00,
          total_adjustment: 5.00
        }
      }).as('rescheduleWithFee')

      cy.visit('/bookings/1/reschedule')
      cy.waitForApiCall('@getBookingForReschedule')
      cy.waitForApiCall('@getRescheduleOptions')
      cy.waitForApiCall('@getRescheduleFee')

      // Should show fee
      cy.contains('Poplatok za preloženie: 5.00 €').should('exist')

      cy.getByDataCy('reschedule-option-3').click()
      cy.getByDataCy('reschedule-reason-select').select('personal_reasons')
      cy.getByDataCy('reschedule-details-input').type('Osobné dôvody')

      // Should show fee confirmation
      cy.getByDataCy('fee-confirmation').should('be.visible')
      cy.contains('Súhlasím s poplatkom 5.00 €').should('exist')
      cy.getByDataCy('fee-agreement-checkbox').check()

      cy.getByDataCy('confirm-reschedule-button').click()
      cy.waitForApiCall('@rescheduleWithFee')

      cy.contains('Rezervácia bola preložená').should('exist')
      cy.contains('Poplatok za preloženie: 5.00 €').should('exist')
    })

    it('should reschedule to different session type with price adjustment', () => {
      cy.intercept('POST', '/api/bookings/1/reschedule', {
        statusCode: 200,
        body: {
          id: 1,
          old_session_id: 1,
          new_session_id: 5,
          price_difference: 15.00,
          reschedule_fee: 0,
          total_adjustment: 15.00
        }
      }).as('rescheduleWithPriceChange')

      cy.visit('/bookings/1/reschedule')
      cy.waitForApiCall('@getBookingForReschedule')
      cy.waitForApiCall('@getRescheduleOptions')

      cy.getByDataCy('reschedule-option-5').click()
      
      // Should show price difference
      cy.contains('Pokročilý tréning').should('exist')
      cy.contains('Cenový rozdiel: +15.00 €').should('exist')
      cy.contains('Celková úprava: 15.00 €').should('exist')

      cy.getByDataCy('reschedule-reason-select').select('upgrade_session')
      cy.getByDataCy('reschedule-details-input').type('Chcem prejsť na pokročilý tréning')

      cy.getByDataCy('confirm-reschedule-button').click()
      cy.waitForApiCall('@rescheduleWithPriceChange')

      cy.contains('Rezervácia bola preložená').should('exist')
      cy.contains('Dodatočný poplatok: 15.00 €').should('exist')
    })

    it('should handle reschedule limit exceeded', () => {
      // Mock booking with max reschedules reached
      cy.intercept('GET', '/api/bookings/1', {
        statusCode: 200,
        body: {
          id: 1,
          reschedule_policy: {
            max_reschedules: 2,
            current_reschedules: 2
          },
          can_reschedule: false,
          reschedule_blocked_reason: 'Dosiahnutý maximálny počet preložení'
        }
      }).as('getBookingMaxReschedules')

      cy.visit('/bookings/1/reschedule')
      cy.waitForApiCall('@getBookingMaxReschedules')

      cy.contains('Dosiahnutý maximálny počet preložení').should('exist')
      cy.contains('2/2 preloženia použité').should('exist')
      cy.getByDataCy('reschedule-options').should('not.exist')
      
      // Should offer alternative actions
      cy.getByDataCy('contact-support-button').should('exist')
      cy.getByDataCy('cancel-booking-alternative-button').should('exist')
    })

    it('should request custom reschedule when no options available', () => {
      // Mock no available options
      cy.intercept('GET', '/api/bookings/1/reschedule-options', {
        statusCode: 200,
        body: []
      }).as('getNoRescheduleOptions')

      cy.intercept('POST', '/api/bookings/1/custom-reschedule-request', {
        statusCode: 201,
        body: {
          id: 1,
          request_status: 'pending',
          message: 'Žiadosť o preloženie odoslaná trénerovi'
        }
      }).as('requestCustomReschedule')

      cy.visit('/bookings/1/reschedule')
      cy.waitForApiCall('@getBookingForReschedule')
      cy.waitForApiCall('@getNoRescheduleOptions')

      cy.contains('Žiadne dostupné termíny').should('exist')
      cy.getByDataCy('custom-reschedule-section').should('be.visible')

      // Fill custom reschedule request
      cy.getByDataCy('preferred-date-1-input').type('2024-02-28')
      cy.getByDataCy('preferred-time-1-input').type('14:00')
      cy.getByDataCy('preferred-date-2-input').type('2024-03-01')
      cy.getByDataCy('preferred-time-2-input').type('10:00')
      
      cy.getByDataCy('custom-reschedule-reason-input').type('Žiadny z dostupných termínov mi nevyhovuje kvôli pracovnému rozvrhu')

      cy.getByDataCy('submit-custom-reschedule-button').click()
      cy.waitForApiCall('@requestCustomReschedule')

      cy.contains('Žiadosť o preloženie odoslaná trénerovi').should('exist')
      cy.contains('Dostanete odpoveď do 24 hodín').should('exist')
    })
  })

  describe('Trainer Cancellation Management', () => {
    beforeEach(() => {
      cy.loginAsTrainer()

      // Mock trainer's upcoming sessions
      cy.intercept('GET', '/api/trainer/sessions/upcoming', {
        statusCode: 200,
        body: [
          {
            id: 1,
            name: 'Základný tréning',
            date: '2024-02-20T10:00:00Z',
            type: 'individual',
            bookings: [
              {
                id: 1,
                owner: { name: 'Ján Novák', phone: '+421 901 234 567' },
                dog: { name: 'Bobík' }
              }
            ],
            can_cancel: true
          },
          {
            id: 2,
            name: 'Skupinový tréning',
            date: '2024-02-21T16:00:00Z',
            type: 'group',
            bookings: [
              { id: 2, owner: { name: 'Anna Nováková' }, dog: { name: 'Líška' } },
              { id: 3, owner: { name: 'Peter Kováč' }, dog: { name: 'Rex' } }
            ],
            can_cancel: true
          }
        ]
      }).as('getTrainerSessions')
    })

    it('should cancel session due to trainer emergency', () => {
      cy.intercept('POST', '/api/trainer/sessions/1/cancel', {
        statusCode: 200,
        body: {
          id: 1,
          status: 'cancelled',
          affected_bookings: 1,
          refunds_processed: 1,
          total_refund_amount: 35.00,
          notifications_sent: 1
        }
      }).as('cancelTrainerSession')

      cy.visit('/trainer/sessions')
      cy.waitForApiCall('@getTrainerSessions')

      cy.getByDataCy('session-1').findByDataCy('cancel-session-button').click()
      
      // Trainer cancellation modal
      cy.getByDataCy('trainer-cancellation-modal').should('be.visible')
      cy.contains('1 rezervácia bude zrušená').should('exist')
      cy.contains('Ján Novák (Bobík)').should('exist')

      cy.getByDataCy('cancellation-reason-select').select('illness')
      cy.getByDataCy('cancellation-details-input').type('Ochorel som a nemôžem viesť tréning')
      
      // Automatic refund options
      cy.getByDataCy('auto-refund-checkbox').should('be.checked')
      cy.getByDataCy('notify-clients-checkbox').should('be.checked')
      
      // Optional alternative date offer
      cy.getByDataCy('offer-alternative-checkbox').check()
      cy.selectDate('[data-cy=alternative-date-input]', '2024-02-22')
      cy.getByDataCy('alternative-time-input').type('10:00')

      cy.getByDataCy('confirm-trainer-cancellation-button').click()
      cy.waitForApiCall('@cancelTrainerSession')

      cy.contains('Session bola zrušená').should('exist')
      cy.contains('1 klient bol upozornený').should('exist')
      cy.contains('35.00 € refund spracovaný').should('exist')
    })

    it('should cancel group session and handle multiple bookings', () => {
      cy.intercept('POST', '/api/trainer/sessions/2/cancel', {
        statusCode: 200,
        body: {
          id: 2,
          status: 'cancelled',
          affected_bookings: 2,
          refunds_processed: 2,
          total_refund_amount: 50.00,
          notifications_sent: 2,
          waitlist_notifications_sent: 0
        }
      }).as('cancelGroupSession')

      cy.visit('/trainer/sessions')
      cy.waitForApiCall('@getTrainerSessions')

      cy.getByDataCy('session-2').findByDataCy('cancel-session-button').click()
      
      cy.contains('2 rezervácie budú zrušené').should('exist')
      cy.contains('Anna Nováková (Líška)').should('exist')
      cy.contains('Peter Kováč (Rex)').should('exist')

      cy.getByDataCy('cancellation-reason-select').select('emergency')
      cy.getByDataCy('cancellation-details-input').type('Rodinná núdzová situácia')
      
      // Group session specific options
      cy.getByDataCy('reschedule-group-checkbox').check()
      cy.selectDate('[data-cy=group-reschedule-date]', '2024-02-23')
      cy.getByDataCy('group-reschedule-time').type('16:00')

      cy.getByDataCy('confirm-trainer-cancellation-button').click()
      cy.waitForApiCall('@cancelGroupSession')

      cy.contains('Skupinová session bola zrušená').should('exist')
      cy.contains('2 klienti boli upozornení').should('exist')
      cy.contains('Nová session navrhnutá na 23. február').should('exist')
    })

    it('should handle reschedule requests from clients', () => {
      // Mock pending reschedule requests
      cy.intercept('GET', '/api/trainer/reschedule-requests*', {
        statusCode: 200,
        body: [
          {
            id: 1,
            booking_id: 1,
            status: 'pending',
            requested_at: '2024-01-18T10:00:00Z',
            current_session: {
              id: 1,
              date: '2024-02-20T10:00:00Z',
              name: 'Základný tréning'
            },
            preferred_dates: [
              { date: '2024-02-22T10:00:00Z', available: true },
              { date: '2024-02-25T14:00:00Z', available: false }
            ],
            reason: 'Pracovný konflikt',
            owner: {
              name: 'Ján Novák',
              phone: '+421 901 234 567'
            },
            dog: {
              name: 'Bobík'
            }
          }
        ]
      }).as('getRescheduleRequests')

      cy.intercept('POST', '/api/trainer/reschedule-requests/1/approve', {
        statusCode: 200,
        body: {
          id: 1,
          status: 'approved',
          new_session_id: 3,
          new_date: '2024-02-22T10:00:00Z'
        }
      }).as('approveReschedule')

      cy.visit('/trainer/reschedule-requests')
      cy.waitForApiCall('@getRescheduleRequests')

      cy.getByDataCy('reschedule-request-1').should('exist')
      cy.contains('Ján Novák (Bobík)').should('exist')
      cy.contains('Pracovný konflikt').should('exist')
      cy.contains('22. február - Dostupné').should('exist')
      cy.contains('25. február - Nedostupné').should('exist')

      cy.getByDataCy('approve-reschedule-button').click()
      
      // Approval modal
      cy.getByDataCy('reschedule-approval-modal').should('be.visible')
      cy.getByDataCy('approved-date-select').select('2024-02-22T10:00:00Z')
      cy.getByDataCy('trainer-notes-input').type('Schválené, nový termín potvrdený')

      cy.getByDataCy('confirm-reschedule-approval-button').click()
      cy.waitForApiCall('@approveReschedule')

      cy.contains('Preloženie schválené').should('exist')
      cy.contains('Klient bol upozornený').should('exist')
    })

    it('should reject reschedule request with alternative suggestions', () => {
      cy.intercept('POST', '/api/trainer/reschedule-requests/1/reject', {
        statusCode: 200,
        body: {
          id: 1,
          status: 'rejected',
          rejection_reason: 'Navrhované termíny nie sú dostupné'
        }
      }).as('rejectReschedule')

      cy.visit('/trainer/reschedule-requests')
      cy.waitForApiCall('@getRescheduleRequests')

      cy.getByDataCy('reject-reschedule-button').click()
      
      cy.getByDataCy('rejection-modal').should('be.visible')
      cy.getByDataCy('rejection-reason-select').select('no_availability')
      cy.getByDataCy('rejection-details-input').type('Navrhované termíny nie sú dostupné')
      
      // Suggest alternatives
      cy.getByDataCy('suggest-alternatives-checkbox').check()
      cy.getByDataCy('alternative-date-1').type('2024-02-24')
      cy.getByDataCy('alternative-time-1').type('10:00')
      cy.getByDataCy('alternative-date-2').type('2024-02-26')
      cy.getByDataCy('alternative-time-2').type('14:00')

      cy.getByDataCy('confirm-rejection-button').click()
      cy.waitForApiCall('@rejectReschedule')

      cy.contains('Preloženie zamietnuté').should('exist')
      cy.contains('Alternatívne termíny navrhnuté').should('exist')
    })
  })

  describe('Cancellation Notifications and Follow-up', () => {
    it('should send cancellation confirmation with refund details', () => {
      cy.loginAsOwner()

      // Mock cancellation notification
      cy.intercept('GET', '/api/notifications', {
        statusCode: 200,
        body: [
          {
            id: 1,
            type: 'booking_cancelled',
            title: 'Rezervácia zrušená',
            message: 'Vaša rezervácia na Základný tréning bola zrušená',
            data: {
              booking_id: 1,
              session_name: 'Základný tréning',
              refund_amount: 35.00,
              refund_timeline: '3-5 pracovných dní',
              cancellation_reason: 'Rodinná núdzová situácia'
            },
            created_at: '2024-01-19T15:00:00Z'
          }
        ]
      }).as('getCancellationNotification')

      cy.visit('/dashboard')
      cy.getByDataCy('notifications-bell').click()
      cy.waitForApiCall('@getCancellationNotification')

      cy.contains('Rezervácia zrušená').should('exist')
      cy.contains('Základný tréning').should('exist')
      cy.contains('Refund: 35.00 €').should('exist')
      cy.contains('3-5 pracovných dní').should('exist')
    })

    it('should track refund processing status', () => {
      cy.loginAsOwner()

      cy.intercept('GET', '/api/refunds/1', {
        statusCode: 200,
        body: {
          id: 1,
          booking_id: 1,
          amount: 35.00,
          status: 'processing',
          requested_at: '2024-01-19T15:00:00Z',
          processing_timeline: '3-5 pracovných dní',
          payment_method: 'credit_card',
          transaction_id: 'REF_001234'
        }
      }).as('getRefundStatus')

      cy.visit('/refunds/1')
      cy.waitForApiCall('@getRefundStatus')

      cy.contains('Refund sa spracováva').should('exist')
      cy.contains('35.00 €').should('exist')
      cy.contains('REF_001234').should('exist')
      cy.contains('Kreditná karta').should('exist')
      cy.contains('3-5 pracovných dní').should('exist')
    })
  })
}) 