describe('Waitlist Flow', () => {
  beforeEach(() => {
    cy.cleanupTestData()
  })

  describe('Joining Waitlist (Owner)', () => {
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

      // Mock full session
      cy.intercept('GET', '/api/sessions/1', {
        statusCode: 200,
        body: {
          id: 1,
          name: 'Skupinový tréning poslušnosti',
          type: 'group',
          date: '2024-02-20T10:00:00Z',
          max_participants: 6,
          current_participants: 6,
          available_spots: 0,
          price: 25.00,
          waitlist_enabled: true,
          waitlist_count: 3
        }
      }).as('getFullSession')
    })

    it('should join waitlist for full session', () => {
      const waitlistData = {
        session_id: 1,
        dog_id: 1,
        priority: 'normal',
        notes: 'Veľmi záujemcovi o tento tréning'
      }

      cy.intercept('POST', '/api/sessions/1/waitlist', {
        statusCode: 201,
        body: {
          id: 1,
          position: 4,
          ...waitlistData,
          estimated_notification_date: '2024-02-18T00:00:00Z'
        }
      }).as('joinWaitlist')

      cy.visit('/sessions/1')
      cy.waitForApiCall('@getFullSession')

      // Should show full session
      cy.contains('6/6 účastníkov').should('exist')
      cy.contains('Session je plne obsadená').should('exist')
      cy.getByDataCy('book-session-button').should('not.exist')

      // Should show waitlist option
      cy.getByDataCy('join-waitlist-button').should('exist')
      cy.contains('3 ľudí v čakacej listine').should('exist')

      cy.getByDataCy('join-waitlist-button').click()

      // Waitlist modal
      cy.getByDataCy('waitlist-modal').should('be.visible')
      cy.getByDataCy('dog-select').select('1') // Bobík
      cy.getByDataCy('waitlist-notes-input').type(waitlistData.notes)
      
      // Priority option
      cy.getByDataCy('priority-select').select('normal')
      
      cy.getByDataCy('confirm-waitlist-button').click()
      cy.waitForApiCall('@joinWaitlist')

      cy.contains('Pridaný do čakacej listiny').should('exist')
      cy.contains('Pozícia: 4').should('exist')
      cy.contains('Očakávané upozornenie: 18. február 2024').should('exist')
    })

    it('should join waitlist with high priority for urgent need', () => {
      const urgentWaitlistData = {
        session_id: 1,
        dog_id: 1,
        priority: 'high',
        notes: 'Urgentná potreba tréningu kvôli behaviorálnym problémom',
        urgency_reason: 'behavioral_issues'
      }

      cy.intercept('POST', '/api/sessions/1/waitlist', {
        statusCode: 201,
        body: {
          id: 2,
          position: 2, // Higher priority = better position
          ...urgentWaitlistData
        }
      }).as('joinUrgentWaitlist')

      cy.visit('/sessions/1')
      cy.waitForApiCall('@getFullSession')

      cy.getByDataCy('join-waitlist-button').click()
      cy.getByDataCy('dog-select').select('1')
      cy.getByDataCy('priority-select').select('high')
      
      // High priority form appears
      cy.getByDataCy('urgency-reason-select').select('behavioral_issues')
      cy.getByDataCy('urgency-details-input').type('Pes má agresívne správanie voči iným psom')
      cy.getByDataCy('waitlist-notes-input').type(urgentWaitlistData.notes)

      cy.getByDataCy('confirm-waitlist-button').click()
      cy.waitForApiCall('@joinUrgentWaitlist')

      cy.contains('Pridaný do čakacej listiny s vysokou prioritou').should('exist')
      cy.contains('Pozícia: 2').should('exist')
    })

    it('should prevent duplicate waitlist entries', () => {
      // Mock existing waitlist entry
      cy.intercept('POST', '/api/sessions/1/waitlist', {
        statusCode: 422,
        body: {
          message: 'Už ste v čakacej listine',
          errors: {
            dog_id: ['Tento pes už je v čakacej listine pre túto session']
          }
        }
      }).as('duplicateWaitlist')

      cy.visit('/sessions/1')
      cy.waitForApiCall('@getFullSession')

      cy.getByDataCy('join-waitlist-button').click()
      cy.getByDataCy('dog-select').select('1')
      cy.getByDataCy('confirm-waitlist-button').click()

      cy.waitForApiCall('@duplicateWaitlist')
      cy.contains('Tento pes už je v čakacej listine').should('exist')
    })

    it('should show waitlist for multiple sessions', () => {
      // Mock multiple full sessions
      cy.intercept('GET', '/api/sessions*', {
        statusCode: 200,
        body: [
          {
            id: 1,
            name: 'Skupinový tréning A',
            available_spots: 0,
            waitlist_enabled: true,
            waitlist_count: 3
          },
          {
            id: 2,
            name: 'Skupinový tréning B',
            available_spots: 0,
            waitlist_enabled: true,
            waitlist_count: 1
          }
        ]
      }).as('getFullSessions')

      cy.intercept('POST', '/api/waitlist/multiple', {
        statusCode: 201,
        body: {
          entries_created: 2,
          message: 'Pridaný do 2 čakacích listín'
        }
      }).as('joinMultipleWaitlists')

      cy.visit('/sessions')
      cy.waitForApiCall('@getFullSessions')

      cy.getByDataCy('join-multiple-waitlists-button').click()
      
      // Multi-waitlist modal
      cy.getByDataCy('multi-waitlist-modal').should('be.visible')
      cy.getByDataCy('dog-select').select('1')
      
      // Select sessions
      cy.getByDataCy('session-1-checkbox').check()
      cy.getByDataCy('session-2-checkbox').check()
      
      cy.getByDataCy('confirm-multiple-waitlist-button').click()
      cy.waitForApiCall('@joinMultipleWaitlists')

      cy.contains('Pridaný do 2 čakacích listín').should('exist')
    })
  })

  describe('Waitlist Management (Owner)', () => {
    beforeEach(() => {
      cy.loginAsOwner()

      // Mock owner's waitlist entries
      cy.intercept('GET', '/api/waitlist*', {
        statusCode: 200,
        body: [
          {
            id: 1,
            position: 2,
            priority: 'high',
            created_at: '2024-01-20T10:00:00Z',
            estimated_notification_date: '2024-02-18T00:00:00Z',
            session: {
              id: 1,
              name: 'Skupinový tréning poslušnosti',
              date: '2024-02-20T10:00:00Z',
              price: 25.00
            },
            dog: {
              id: 1,
              name: 'Bobík'
            },
            status: 'active'
          },
          {
            id: 2,
            position: 5,
            priority: 'normal',
            created_at: '2024-01-21T14:00:00Z',
            estimated_notification_date: '2024-02-19T00:00:00Z',
            session: {
              id: 2,
              name: 'Pokročilý tréning',
              date: '2024-02-25T16:00:00Z',
              price: 35.00
            },
            dog: {
              id: 1,
              name: 'Bobík'
            },
            status: 'active'
          }
        ]
      }).as('getWaitlistEntries')
    })

    it('should display owner\'s waitlist entries', () => {
      cy.visit('/waitlist')
      cy.waitForApiCall('@getWaitlistEntries')

      // Should show waitlist entries
      cy.contains('Skupinový tréning poslušnosti').should('exist')
      cy.contains('Pokročilý tréning').should('exist')

      // Check positions and details
      cy.getByDataCy('waitlist-entry-1').should('contain', 'Pozícia: 2')
      cy.getByDataCy('waitlist-entry-1').should('contain', 'Vysoká priorita')
      cy.getByDataCy('waitlist-entry-2').should('contain', 'Pozícia: 5')
      cy.getByDataCy('waitlist-entry-2').should('contain', 'Normálna priorita')

      // Check estimated dates
      cy.contains('Očakávané upozornenie: 18. február').should('exist')
      cy.contains('Očakávané upozornenie: 19. február').should('exist')
    })

    it('should leave waitlist', () => {
      cy.intercept('DELETE', '/api/waitlist/1', {
        statusCode: 200,
        body: {
          message: 'Odstránený z čakacej listiny'
        }
      }).as('leaveWaitlist')

      cy.visit('/waitlist')
      cy.waitForApiCall('@getWaitlistEntries')

      cy.getByDataCy('waitlist-entry-1').findByDataCy('leave-waitlist-button').click()
      
      // Confirmation modal
      cy.getByDataCy('leave-confirmation-modal').should('be.visible')
      cy.getByDataCy('leave-reason-select').select('no_longer_needed')
      cy.getByDataCy('confirm-leave-button').click()

      cy.waitForApiCall('@leaveWaitlist')
      cy.contains('Odstránený z čakacej listiny').should('exist')
    })

    it('should update waitlist priority', () => {
      cy.intercept('PUT', '/api/waitlist/2/priority', {
        statusCode: 200,
        body: {
          id: 2,
          position: 3, // Better position due to priority change
          priority: 'high',
          message: 'Priorita aktualizovaná'
        }
      }).as('updatePriority')

      cy.visit('/waitlist')
      cy.waitForApiCall('@getWaitlistEntries')

      cy.getByDataCy('waitlist-entry-2').findByDataCy('update-priority-button').click()
      
      cy.getByDataCy('priority-modal').should('be.visible')
      cy.getByDataCy('new-priority-select').select('high')
      cy.getByDataCy('priority-reason-select').select('urgent_need')
      cy.getByDataCy('priority-details-input').type('Zmenené okolnosti - nový problém so správaním')
      cy.getByDataCy('confirm-priority-button').click()

      cy.waitForApiCall('@updatePriority')
      cy.contains('Priorita aktualizovaná').should('exist')
      cy.contains('Pozícia: 3').should('exist')
    })

    it('should show waitlist notifications settings', () => {
      cy.intercept('PUT', '/api/waitlist/notifications', {
        statusCode: 200,
        body: {
          message: 'Nastavenia upozornení aktualizované'
        }
      }).as('updateNotifications')

      cy.visit('/waitlist/settings')

      // Notification preferences
      cy.getByDataCy('email-notifications-checkbox').check()
      cy.getByDataCy('sms-notifications-checkbox').check()
      cy.getByDataCy('push-notifications-checkbox').check()
      
      // Advanced settings
      cy.getByDataCy('advance-notice-hours-input').clear().type('24')
      cy.getByDataCy('position-update-notifications-checkbox').check()
      
      cy.getByDataCy('save-notifications-button').click()
      cy.waitForApiCall('@updateNotifications')

      cy.contains('Nastavenia upozornení aktualizované').should('exist')
    })
  })

  describe('Waitlist Management (Trainer)', () => {
    beforeEach(() => {
      cy.loginAsTrainer()

      // Mock session waitlist
      cy.intercept('GET', '/api/trainer/sessions/1/waitlist', {
        statusCode: 200,
        body: [
          {
            id: 1,
            position: 1,
            priority: 'high',
            created_at: '2024-01-19T08:00:00Z',
            notes: 'Urgentná potreba tréningu',
            urgency_reason: 'behavioral_issues',
            dog: {
              id: 1,
              name: 'Bobík',
              breed: 'Nemecký ovčiak',
              age: 3
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
            position: 2,
            priority: 'normal',
            created_at: '2024-01-20T10:00:00Z',
            notes: 'Zaujímame sa o skupinový tréning',
            dog: {
              id: 2,
              name: 'Líška',
              breed: 'Border Collie',
              age: 2
            },
            owner: {
              id: 2,
              name: 'Anna Nováková',
              email: 'anna.novakova@test.com',
              phone: '+421 905 567 890'
            }
          }
        ]
      }).as('getSessionWaitlist')
    })

    it('should view session waitlist with priorities', () => {
      cy.visit('/trainer/sessions/1/waitlist')
      cy.waitForApiCall('@getSessionWaitlist')

      // Should show waitlist entries
      cy.contains('Čakacia listina').should('exist')
      cy.getByDataCy('waitlist-entry-1').should('exist')
      cy.getByDataCy('waitlist-entry-2').should('exist')

      // Check priority indicators
      cy.getByDataCy('waitlist-entry-1').should('contain', 'Vysoká priorita')
      cy.getByDataCy('waitlist-entry-1').should('contain', 'Behaviorálne problémy')
      cy.getByDataCy('waitlist-entry-2').should('contain', 'Normálna priorita')

      // Check contact info
      cy.contains('Ján Novák').should('exist')
      cy.contains('jan.novak@test.com').should('exist')
      cy.contains('+421 901 234 567').should('exist')
    })

    it('should notify waitlist when spot becomes available', () => {
      cy.intercept('POST', '/api/trainer/sessions/1/waitlist/notify', {
        statusCode: 200,
        body: {
          notifications_sent: 1,
          notified_entry: {
            id: 1,
            owner: {
              name: 'Ján Novák',
              email: 'jan.novak@test.com'
            }
          },
          message: 'Upozornenie odoslané Ján Novák'
        }
      }).as('notifyWaitlist')

      cy.visit('/trainer/sessions/1/waitlist')
      cy.waitForApiCall('@getSessionWaitlist')

      // Simulate cancellation creating a spot
      cy.getByDataCy('spot-available-button').click()
      
      cy.getByDataCy('notify-modal').should('be.visible')
      cy.contains('Upozorniť prvého v čakacej listine?').should('exist')
      cy.contains('Ján Novák (Vysoká priorita)').should('exist')
      
      cy.getByDataCy('notification-deadline-input').type('2024-02-17T23:59')
      cy.getByDataCy('custom-message-input').type('Uvoľnilo sa miesto v skupinovom tréningu. Máte 24 hodín na potvrdenie.')
      
      cy.getByDataCy('send-notification-button').click()
      cy.waitForApiCall('@notifyWaitlist')

      cy.contains('Upozornenie odoslané Ján Novák').should('exist')
    })

    it('should manually adjust waitlist positions', () => {
      cy.intercept('PUT', '/api/trainer/sessions/1/waitlist/reorder', {
        statusCode: 200,
        body: {
          message: 'Poradie čakacej listiny aktualizované'
        }
      }).as('reorderWaitlist')

      cy.visit('/trainer/sessions/1/waitlist')
      cy.waitForApiCall('@getSessionWaitlist')

      // Enable reorder mode
      cy.getByDataCy('reorder-waitlist-button').click()
      
      // Drag and drop to reorder (simulated)
      cy.getByDataCy('waitlist-entry-2').trigger('dragstart')
      cy.getByDataCy('waitlist-entry-1').trigger('drop')
      
      // Confirm reorder
      cy.getByDataCy('confirm-reorder-button').click()
      cy.waitForApiCall('@reorderWaitlist')

      cy.contains('Poradie čakacej listiny aktualizované').should('exist')
    })

    it('should bulk manage waitlist entries', () => {
      cy.intercept('POST', '/api/trainer/sessions/1/waitlist/bulk-action', {
        statusCode: 200,
        body: {
          affected_entries: 2,
          message: '2 záznamy z čakacej listiny boli aktualizované'
        }
      }).as('bulkWaitlistAction')

      cy.visit('/trainer/sessions/1/waitlist')
      cy.waitForApiCall('@getSessionWaitlist')

      // Select multiple entries
      cy.getByDataCy('waitlist-entry-1').findByDataCy('select-checkbox').check()
      cy.getByDataCy('waitlist-entry-2').findByDataCy('select-checkbox').check()

      cy.getByDataCy('bulk-actions-button').click()
      cy.getByDataCy('bulk-notify-button').click()
      
      // Bulk notification modal
      cy.getByDataCy('bulk-notification-modal').should('be.visible')
      cy.getByDataCy('bulk-message-input').type('Plánujeme pridať novú session. Sledujte svoje emaily.')
      cy.getByDataCy('send-bulk-notification-button').click()

      cy.waitForApiCall('@bulkWaitlistAction')
      cy.contains('2 záznamy z čakacej listiny boli aktualizované').should('exist')
    })

    it('should create additional session for waitlist demand', () => {
      cy.intercept('POST', '/api/trainer/sessions/create-from-waitlist', {
        statusCode: 201,
        body: {
          id: 3,
          name: 'Skupinový tréning poslušnosti - Dodatočná session',
          date: '2024-02-22T10:00:00Z',
          waitlist_transfers: 2,
          message: 'Nová session vytvorená a 2 ľudia z čakacej listiny boli presunutí'
        }
      }).as('createFromWaitlist')

      cy.visit('/trainer/sessions/1/waitlist')
      cy.waitForApiCall('@getSessionWaitlist')

      cy.getByDataCy('create-additional-session-button').click()
      
      // Additional session modal
      cy.getByDataCy('additional-session-modal').should('be.visible')
      cy.selectDate('[data-cy=new-session-date]', '2024-02-22')
      cy.getByDataCy('new-session-time').type('10:00')
      cy.getByDataCy('transfer-waitlist-checkbox').check()
      
      cy.getByDataCy('create-additional-session-confirm-button').click()
      cy.waitForApiCall('@createFromWaitlist')

      cy.contains('Nová session vytvorená a 2 ľudia z čakacej listiny boli presunutí').should('exist')
    })
  })

  describe('Waitlist Notifications', () => {
    it('should receive notification when spot becomes available', () => {
      cy.loginAsOwner()

      // Mock notification received
      cy.intercept('GET', '/api/notifications', {
        statusCode: 200,
        body: [
          {
            id: 1,
            type: 'waitlist_spot_available',
            title: 'Miesto dostupné!',
            message: 'Uvoľnilo sa miesto v Skupinový tréning poslušnosti',
            data: {
              session_id: 1,
              session_name: 'Skupinový tréning poslušnosti',
              deadline: '2024-02-17T23:59:00Z'
            },
            created_at: '2024-02-16T10:00:00Z',
            read_at: null
          }
        ]
      }).as('getWaitlistNotifications')

      cy.visit('/dashboard')
      cy.getByDataCy('notifications-bell').click()
      cy.waitForApiCall('@getWaitlistNotifications')

      // Should show notification
      cy.contains('Miesto dostupné!').should('exist')
      cy.contains('Skupinový tréning poslušnosti').should('exist')
      cy.contains('Deadline: 17. február 23:59').should('exist')
      
      // Should have action buttons
      cy.getByDataCy('book-now-button').should('exist')
      cy.getByDataCy('decline-spot-button').should('exist')
    })

    it('should book available spot from waitlist notification', () => {
      cy.loginAsOwner()

      cy.intercept('POST', '/api/waitlist/1/convert-to-booking', {
        statusCode: 201,
        body: {
          booking_id: 10,
          session_id: 1,
          message: 'Miesto rezervované z čakacej listiny'
        }
      }).as('convertWaitlistToBooking')

      // Mock the available spot notification
      cy.window().then((win) => {
        win.localStorage.setItem('waitlist-notification', JSON.stringify({
          waitlist_id: 1,
          session_id: 1,
          deadline: '2024-02-17T23:59:00Z'
        }))
      })

      cy.visit('/waitlist/book/1')
      
      cy.getByDataCy('confirm-spot-booking-button').click()
      cy.waitForApiCall('@convertWaitlistToBooking')

      cy.contains('Miesto rezervované z čakacej listiny').should('exist')
      cy.url().should('include', '/bookings')
    })

    it('should decline available spot and remain in waitlist', () => {
      cy.loginAsOwner()

      cy.intercept('POST', '/api/waitlist/1/decline-spot', {
        statusCode: 200,
        body: {
          message: 'Miesto odmietnuté, ostávate v čakacej listine'
        }
      }).as('declineSpot')

      cy.visit('/waitlist/book/1')
      
      cy.getByDataCy('decline-spot-button').click()
      cy.getByDataCy('decline-reason-select').select('schedule_conflict')
      cy.getByDataCy('confirm-decline-button').click()

      cy.waitForApiCall('@declineSpot')
      cy.contains('Miesto odmietnuté, ostávate v čakacej listine').should('exist')
    })
  })
}) 