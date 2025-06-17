describe('Group Sessions & Signup Flow', () => {
  beforeEach(() => {
    cy.cleanupTestData()
  })

  describe('Group Session Creation (Trainer)', () => {
    beforeEach(() => {
      cy.loginAsTrainer()
    })

    it('should create a new group session', () => {
      const sessionData = {
        name: 'Skupinový tréning poslušnosti',
        description: 'Základy poslušnosti pre psov v skupinovom prostredí',
        type: 'group',
        date: '2024-02-20',
        time: '10:00',
        duration: 90,
        max_participants: 6,
        price: 25.00,
        location: 'Vonkajšie ihrisko',
        requirements: 'Pes musí mať základné očkovania'
      }

      cy.intercept('POST', '/api/trainer/sessions', {
        statusCode: 201,
        body: {
          id: 1,
          ...sessionData,
          trainer_id: 1,
          available_spots: 6,
          current_participants: 0
        }
      }).as('createGroupSession')

      cy.visit('/trainer/sessions/create')

      // Fill session form
      cy.getByDataCy('session-name-input').type(sessionData.name)
      cy.getByDataCy('session-description-input').type(sessionData.description)
      cy.getByDataCy('session-type-select').select(sessionData.type)
      cy.selectDate('[data-cy=session-date-input]', sessionData.date)
      cy.getByDataCy('session-time-input').type(sessionData.time)
      cy.getByDataCy('session-duration-input').type(sessionData.duration.toString())
      cy.getByDataCy('max-participants-input').type(sessionData.max_participants.toString())
      cy.getByDataCy('session-price-input').type(sessionData.price.toString())
      cy.getByDataCy('session-location-input').type(sessionData.location)
      cy.getByDataCy('session-requirements-input').type(sessionData.requirements)

      cy.getByDataCy('create-session-button').click()
      cy.waitForApiCall('@createGroupSession')

      cy.url().should('include', '/trainer/sessions')
      cy.contains('Skupinová session bola vytvorená').should('exist')
    })

    it('should create recurring group sessions', () => {
      const recurringData = {
        name: 'Týždenný skupinový tréning',
        type: 'group',
        recurrence_type: 'weekly',
        recurrence_count: 8,
        start_date: '2024-02-20',
        time: '18:00',
        duration: 60,
        max_participants: 8,
        price: 20.00
      }

      cy.intercept('POST', '/api/trainer/sessions/recurring', {
        statusCode: 201,
        body: {
          created_sessions: 8,
          message: '8 opakujúcich sa sessions bolo vytvorených'
        }
      }).as('createRecurringSessions')

      cy.visit('/trainer/sessions/create')

      cy.getByDataCy('session-name-input').type(recurringData.name)
      cy.getByDataCy('session-type-select').select(recurringData.type)
      
      // Enable recurring
      cy.getByDataCy('recurring-checkbox').check()
      cy.getByDataCy('recurrence-type-select').select(recurringData.recurrence_type)
      cy.getByDataCy('recurrence-count-input').type(recurringData.recurrence_count.toString())
      
      cy.selectDate('[data-cy=start-date-input]', recurringData.start_date)
      cy.getByDataCy('session-time-input').type(recurringData.time)
      cy.getByDataCy('session-duration-input').type(recurringData.duration.toString())
      cy.getByDataCy('max-participants-input').type(recurringData.max_participants.toString())
      cy.getByDataCy('session-price-input').type(recurringData.price.toString())

      cy.getByDataCy('create-session-button').click()
      cy.waitForApiCall('@createRecurringSessions')

      cy.contains('8 opakujúcich sa sessions bolo vytvorených').should('exist')
    })

    it('should show validation errors for invalid group session data', () => {
      cy.visit('/trainer/sessions/create')

      cy.getByDataCy('session-type-select').select('group')
      cy.getByDataCy('create-session-button').click()

      // Should show validation errors
      cy.contains('Názov je povinný').should('exist')
      cy.contains('Dátum je povinný').should('exist')
      cy.contains('Čas je povinný').should('exist')
      cy.contains('Maximálny počet účastníkov je povinný').should('exist')

      // Test invalid max participants
      cy.getByDataCy('max-participants-input').type('0')
      cy.getByDataCy('session-name-input').click() // Trigger blur
      cy.contains('Minimálny počet účastníkov je 2').should('exist')

      cy.getByDataCy('max-participants-input').clear().type('50')
      cy.getByDataCy('session-name-input').click()
      cy.contains('Maximálny počet účastníkov je 20').should('exist')
    })
  })

  describe('Group Session Listing & Discovery', () => {
    beforeEach(() => {
      cy.loginAsOwner()

      // Mock available group sessions
      cy.intercept('GET', '/api/sessions*', {
        statusCode: 200,
        body: [
          {
            id: 1,
            name: 'Skupinový tréning poslušnosti',
            description: 'Základy poslušnosti pre psov v skupinovom prostredí',
            type: 'group',
            date: '2024-02-20T10:00:00Z',
            duration: 90,
            max_participants: 6,
            current_participants: 3,
            available_spots: 3,
            price: 25.00,
            location: 'Vonkajšie ihrisko',
            requirements: 'Pes musí mať základné očkovania',
            trainer: {
              id: 1,
              name: 'Mária Trénerová',
              specialization: 'Skupinový tréning'
            }
          },
          {
            id: 2,
            name: 'Pokročilý skupinový tréning',
            description: 'Pre psov s pokročilými zručnosťami',
            type: 'group',
            date: '2024-02-22T16:00:00Z',
            duration: 120,
            max_participants: 4,
            current_participants: 4,
            available_spots: 0,
            price: 35.00,
            location: 'Vnútorná hala',
            requirements: 'Pes musí absolvovať základný tréning',
            trainer: {
              id: 1,
              name: 'Mária Trénerová',
              specialization: 'Pokročilý tréning'
            }
          }
        ]
      }).as('getGroupSessions')
    })

    it('should display available group sessions', () => {
      cy.visit('/sessions?type=group')
      cy.waitForApiCall('@getGroupSessions')

      // Should show group sessions
      cy.contains('Skupinový tréning poslušnosti').should('exist')
      cy.contains('Pokročilý skupinový tréning').should('exist')

      // Check session details
      cy.getByDataCy('session-card-1').should('contain', '3/6 účastníkov')
      cy.getByDataCy('session-card-1').should('contain', '25.00 €')
      cy.getByDataCy('session-card-1').should('contain', '90 minút')

      // Full session should show as full
      cy.getByDataCy('session-card-2').should('contain', 'Obsadené')
      cy.getByDataCy('session-card-2').findByDataCy('book-session-button').should('be.disabled')
    })

    it('should filter group sessions by difficulty and availability', () => {
      cy.visit('/sessions?type=group')
      cy.waitForApiCall('@getGroupSessions')

      // Filter by availability
      cy.getByDataCy('availability-filter-select').select('available')
      cy.contains('Skupinový tréning poslušnosti').should('exist')
      cy.contains('Pokročilý skupinový tréning').should('not.exist')

      // Filter by full sessions
      cy.getByDataCy('availability-filter-select').select('full')
      cy.contains('Pokročilý skupinový tréning').should('exist')
      cy.contains('Skupinový tréning poslušnosti').should('not.exist')
    })

    it('should show session participants for transparency', () => {
      cy.intercept('GET', '/api/sessions/1/participants', {
        statusCode: 200,
        body: [
          {
            id: 1,
            dog: {
              name: 'Bobík',
              breed: 'Nemecký ovčiak',
              age: 3
            },
            owner: {
              name: 'Ján N.' // Anonymized
            },
            joined_at: '2024-01-15T10:00:00Z'
          },
          {
            id: 2,
            dog: {
              name: 'Líška',
              breed: 'Border Collie',
              age: 2
            },
            owner: {
              name: 'Anna K.'
            },
            joined_at: '2024-01-16T14:00:00Z'
          },
          {
            id: 3,
            dog: {
              name: 'Rex',
              breed: 'Labrádor',
              age: 4
            },
            owner: {
              name: 'Peter M.'
            },
            joined_at: '2024-01-17T09:00:00Z'
          }
        ]
      }).as('getSessionParticipants')

      cy.visit('/sessions/1')
      cy.getByDataCy('view-participants-button').click()

      cy.waitForApiCall('@getSessionParticipants')
      
      // Should show participant info
      cy.contains('Bobík (Nemecký ovčiak)').should('exist')
      cy.contains('Líška (Border Collie)').should('exist')
      cy.contains('Rex (Labrádor)').should('exist')
      cy.contains('3/6 účastníkov').should('exist')
    })
  })

  describe('Group Session Signup Flow', () => {
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
            medical_info: 'Všetky očkovania aktuálne'
          },
          {
            id: 2,
            name: 'Líška',
            breed: 'Border Collie',
            age: 1,
            medical_info: 'Mladý pes, základné očkovania'
          }
        ]
      }).as('getOwnerDogs')

      // Mock group session
      cy.intercept('GET', '/api/sessions/1', {
        statusCode: 200,
        body: {
          id: 1,
          name: 'Skupinový tréning poslušnosti',
          type: 'group',
          date: '2024-02-20T10:00:00Z',
          duration: 90,
          max_participants: 6,
          current_participants: 3,
          available_spots: 3,
          price: 25.00,
          requirements: 'Pes musí mať základné očkovania a byť starší ako 6 mesiacov'
        }
      }).as('getGroupSession')
    })

    it('should successfully signup for group session', () => {
      const signupData = {
        session_id: 1,
        dog_id: 1,
        notes: 'Bobík je priateľský, ale potrebuje prácu na socializácii'
      }

      cy.intercept('POST', '/api/sessions/1/signup', {
        statusCode: 201,
        body: {
          id: 1,
          status: 'pending',
          ...signupData,
          session: {
            id: 1,
            name: 'Skupinový tréning poslušnosti',
            date: '2024-02-20T10:00:00Z'
          }
        }
      }).as('signupForSession')

      cy.visit('/sessions/1')
      cy.waitForApiCall('@getGroupSession')

      cy.getByDataCy('signup-session-button').click()

      // Signup modal should open
      cy.getByDataCy('signup-modal').should('be.visible')
      cy.getByDataCy('session-requirements').should('contain', 'základné očkovania')

      // Select dog
      cy.getByDataCy('dog-select').select('1') // Bobík

      // Check if dog meets requirements
      cy.getByDataCy('requirements-check').should('contain', 'Bobík spĺňa požiadavky')

      // Add notes
      cy.getByDataCy('signup-notes-input').type(signupData.notes)

      cy.getByDataCy('confirm-signup-button').click()
      cy.waitForApiCall('@signupForSession')

      cy.contains('Prihláška na session bola odoslaná').should('exist')
      cy.getByDataCy('signup-modal').should('not.exist')
    })

    it('should prevent signup if dog doesn\'t meet requirements', () => {
      cy.visit('/sessions/1')
      cy.waitForApiCall('@getGroupSession')

      cy.getByDataCy('signup-session-button').click()
      cy.getByDataCy('dog-select').select('2') // Líška (too young)

      // Should show warning
      cy.getByDataCy('requirements-warning').should('contain', 'Líška nespĺňa všetky požiadavky')
      cy.getByDataCy('requirements-warning').should('contain', 'mladšia ako 6 mesiacov')
      
      // Signup button should be disabled
      cy.getByDataCy('confirm-signup-button').should('be.disabled')
    })

    it('should handle session full scenario', () => {
      // Mock full session
      cy.intercept('GET', '/api/sessions/1', {
        statusCode: 200,
        body: {
          id: 1,
          name: 'Skupinový tréning poslušnosti',
          type: 'group',
          current_participants: 6,
          max_participants: 6,
          available_spots: 0
        }
      }).as('getFullSession')

      cy.visit('/sessions/1')
      cy.waitForApiCall('@getFullSession')

      // Should show full message
      cy.contains('Session je plne obsadená').should('exist')
      cy.getByDataCy('signup-session-button').should('not.exist')
      
      // Should show waitlist option
      cy.getByDataCy('join-waitlist-button').should('exist')
    })

    it('should allow multiple dog signups for group session', () => {
      cy.intercept('POST', '/api/sessions/1/signup', {
        statusCode: 201,
        body: {
          signups: [
            { id: 1, dog_id: 1, status: 'pending' },
            { id: 2, dog_id: 2, status: 'pending' }
          ]
        }
      }).as('multipleSignups')

      cy.visit('/sessions/1')
      cy.waitForApiCall('@getGroupSession')

      cy.getByDataCy('signup-session-button').click()
      
      // Enable multiple dogs
      cy.getByDataCy('multiple-dogs-checkbox').check()
      
      // Select both dogs
      cy.getByDataCy('dog-checkbox-1').check() // Bobík
      cy.getByDataCy('dog-checkbox-2').check() // Líška

      cy.getByDataCy('confirm-signup-button').click()
      cy.waitForApiCall('@multipleSignups')

      cy.contains('2 psy boli prihlásení na session').should('exist')
    })

    it('should show group session pricing with discounts', () => {
      // Mock session with group discount
      cy.intercept('GET', '/api/sessions/1', {
        statusCode: 200,
        body: {
          id: 1,
          name: 'Skupinový tréning poslušnosti',
          type: 'group',
          price: 25.00,
          group_discount: {
            min_dogs: 2,
            discount_percent: 15
          }
        }
      }).as('getSessionWithDiscount')

      cy.visit('/sessions/1')
      cy.waitForApiCall('@getSessionWithDiscount')

      cy.getByDataCy('signup-session-button').click()
      
      // Select one dog - regular price
      cy.getByDataCy('dog-select').select('1')
      cy.getByDataCy('pricing-info').should('contain', '25.00 €')

      // Select multiple dogs - discounted price
      cy.getByDataCy('multiple-dogs-checkbox').check()
      cy.getByDataCy('dog-checkbox-1').check()
      cy.getByDataCy('dog-checkbox-2').check()

      cy.getByDataCy('pricing-info').should('contain', '42.50 €') // 2 * 25 * 0.85
      cy.getByDataCy('discount-info').should('contain', '15% zľava pre viacero psov')
    })
  })

  describe('Trainer Group Session Management', () => {
    beforeEach(() => {
      cy.loginAsTrainer()

      // Mock trainer's group sessions with signups
      cy.intercept('GET', '/api/trainer/sessions*', {
        statusCode: 200,
        body: [
          {
            id: 1,
            name: 'Skupinový tréning poslušnosti',
            type: 'group',
            date: '2024-02-20T10:00:00Z',
            max_participants: 6,
            current_participants: 4,
            pending_signups: 2,
            status: 'upcoming'
          }
        ]
      }).as('getTrainerSessions')

      // Mock pending signups
      cy.intercept('GET', '/api/trainer/sessions/1/signups*', {
        statusCode: 200,
        body: [
          {
            id: 1,
            status: 'pending',
            notes: 'Pes potrebuje prácu na socializácii',
            created_at: '2024-01-20T10:00:00Z',
            dog: {
              id: 1,
              name: 'Bobík',
              breed: 'Nemecký ovčiak',
              age: 3,
              size: 'large'
            },
            owner: {
              id: 1,
              name: 'Ján Novák',
              email: 'jan.novak@test.com'
            }
          },
          {
            id: 2,
            status: 'pending',
            notes: 'Prvý skupinový tréning',
            created_at: '2024-01-21T14:00:00Z',
            dog: {
              id: 2,
              name: 'Líška',
              breed: 'Border Collie',
              age: 2,
              size: 'medium'
            },
            owner: {
              id: 2,
              name: 'Anna Nováková',
              email: 'anna.novakova@test.com'
            }
          }
        ]
      }).as('getPendingSignups')
    })

    it('should display pending signups for group session', () => {
      cy.visit('/trainer/sessions/1/signups')
      cy.waitForApiCall('@getPendingSignups')

      // Should show pending signups
      cy.contains('Čakajúce prihlášky').should('exist')
      cy.getByDataCy('signup-1').should('exist')
      cy.getByDataCy('signup-2').should('exist')

      // Check signup details
      cy.contains('Bobík').should('exist')
      cy.contains('Nemecký ovčiak').should('exist')
      cy.contains('Ján Novák').should('exist')
      cy.contains('prácu na socializácii').should('exist')
    })

    it('should approve individual signups', () => {
      cy.intercept('POST', '/api/trainer/signups/1/approve', {
        statusCode: 200,
        body: {
          id: 1,
          status: 'confirmed',
          approved_at: new Date().toISOString()
        }
      }).as('approveSignup')

      cy.visit('/trainer/sessions/1/signups')
      cy.waitForApiCall('@getPendingSignups')

      cy.getByDataCy('signup-1').findByDataCy('approve-button').click()
      
      // Quick approval
      cy.getByDataCy('quick-approve-button').click()

      cy.waitForApiCall('@approveSignup')
      cy.contains('Prihláška bola schválená').should('exist')
    })

    it('should approve multiple signups at once', () => {
      cy.intercept('POST', '/api/trainer/signups/bulk-approve', {
        statusCode: 200,
        body: {
          approved_count: 2,
          message: '2 prihlášky boli schválené'
        }
      }).as('bulkApproveSignups')

      cy.visit('/trainer/sessions/1/signups')
      cy.waitForApiCall('@getPendingSignups')

      // Select multiple signups
      cy.getByDataCy('signup-1').findByDataCy('select-checkbox').check()
      cy.getByDataCy('signup-2').findByDataCy('select-checkbox').check()

      cy.getByDataCy('bulk-actions-button').click()
      cy.getByDataCy('bulk-approve-signups-button').click()

      cy.getByDataCy('bulk-approval-modal').should('be.visible')
      cy.getByDataCy('confirm-bulk-approval-button').click()

      cy.waitForApiCall('@bulkApproveSignups')
      cy.contains('2 prihlášky boli schválené').should('exist')
    })

    it('should reject signup with capacity consideration', () => {
      cy.intercept('POST', '/api/trainer/signups/2/reject', {
        statusCode: 200,
        body: {
          id: 2,
          status: 'rejected',
          rejection_reason: 'Session je už plne obsadená'
        }
      }).as('rejectSignup')

      cy.visit('/trainer/sessions/1/signups')
      cy.waitForApiCall('@getPendingSignups')

      cy.getByDataCy('signup-2').findByDataCy('reject-button').click()
      
      cy.getByDataCy('rejection-modal').should('be.visible')
      cy.getByDataCy('rejection-reason-select').select('capacity_full')
      cy.getByDataCy('suggest-alternative-checkbox').check()
      cy.getByDataCy('confirm-rejection-button').click()

      cy.waitForApiCall('@rejectSignup')
      cy.contains('Prihláška bola zamietnutá').should('exist')
    })

    it('should manage session capacity dynamically', () => {
      cy.intercept('PUT', '/api/trainer/sessions/1/capacity', {
        statusCode: 200,
        body: {
          id: 1,
          max_participants: 8,
          message: 'Kapacita bola zvýšená na 8 účastníkov'
        }
      }).as('updateCapacity')

      cy.visit('/trainer/sessions/1')
      
      cy.getByDataCy('edit-capacity-button').click()
      cy.getByDataCy('capacity-input').clear().type('8')
      cy.getByDataCy('capacity-reason-input').type('Väčší priestor k dispozícii')
      cy.getByDataCy('save-capacity-button').click()

      cy.waitForApiCall('@updateCapacity')
      cy.contains('Kapacita bola zvýšená na 8 účastníkov').should('exist')
    })

    it('should view and manage group dynamics', () => {
      cy.intercept('GET', '/api/trainer/sessions/1/group-analysis', {
        statusCode: 200,
        body: {
          participants: [
            {
              dog: { name: 'Bobík', age: 3, size: 'large', temperament: 'calm' },
              compatibility_score: 8.5
            },
            {
              dog: { name: 'Líška', age: 2, size: 'medium', temperament: 'energetic' },
              compatibility_score: 7.2
            }
          ],
          group_compatibility: 8.0,
          recommendations: [
            'Dobrá kombinácia veľkostí',
            'Pozor na energické psy s pokojnými'
          ]
        }
      }).as('getGroupAnalysis')

      cy.visit('/trainer/sessions/1/analysis')
      cy.waitForApiCall('@getGroupAnalysis')

      cy.contains('Analýza skupiny').should('exist')
      cy.contains('8.0/10').should('exist') // Group compatibility
      cy.contains('Dobrá kombinácia veľkostí').should('exist')
      cy.contains('Pozor na energické psy').should('exist')
    })
  })

  describe('Group Session Communication', () => {
    beforeEach(() => {
      cy.loginAsTrainer()
    })

    it('should send message to all group participants', () => {
      cy.intercept('POST', '/api/trainer/sessions/1/broadcast', {
        statusCode: 200,
        body: {
          message_sent: true,
          recipients_count: 4
        }
      }).as('broadcastMessage')

      cy.visit('/trainer/sessions/1')
      
      cy.getByDataCy('message-participants-button').click()
      cy.getByDataCy('broadcast-modal').should('be.visible')
      
      cy.getByDataCy('message-subject-input').type('Príprava na skupinový tréning')
      cy.getByDataCy('message-body-input').type('Nezabudnite priniesť obľúbenú hračku vášho psa')
      
      cy.getByDataCy('send-broadcast-button').click()
      cy.waitForApiCall('@broadcastMessage')

      cy.contains('Správa bola odoslaná 4 účastníkom').should('exist')
    })

    it('should create pre-session checklist for participants', () => {
      cy.intercept('POST', '/api/trainer/sessions/1/checklist', {
        statusCode: 201,
        body: {
          id: 1,
          items: [
            'Prineste obľúbenú hračku',
            'Pes by mal byť hladný (2 hodiny bez jedla)',
            'Povodok a obojok',
            'Očkovací preukaz'
          ]
        }
      }).as('createChecklist')

      cy.visit('/trainer/sessions/1/preparation')
      
      cy.getByDataCy('add-checklist-item-input').type('Prineste obľúbenú hračku')
      cy.getByDataCy('add-item-button').click()
      
      cy.getByDataCy('add-checklist-item-input').type('Pes by mal byť hladný (2 hodiny bez jedla)')
      cy.getByDataCy('add-item-button').click()
      
      cy.getByDataCy('save-checklist-button').click()
      cy.waitForApiCall('@createChecklist')

      cy.contains('Kontrolný zoznam bol vytvorený').should('exist')
    })
  })
}) 