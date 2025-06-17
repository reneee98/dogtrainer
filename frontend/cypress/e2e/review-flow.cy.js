describe('Review & Rating Flow', () => {
  beforeEach(() => {
    cy.cleanupTestData()
  })

  describe('Writing Reviews (Owner)', () => {
    beforeEach(() => {
      cy.loginAsOwner()

      // Mock completed bookings available for review
      cy.intercept('GET', '/api/bookings/reviewable', {
        statusCode: 200,
        body: [
          {
            id: 1,
            status: 'completed',
            completed_at: '2024-01-15T16:00:00Z',
            session: {
              id: 1,
              name: 'Základný tréning',
              date: '2024-01-15T10:00:00Z',
              trainer: {
                id: 1,
                name: 'Mária Trénerová',
                specialization: 'Základný tréning'
              }
            },
            dog: {
              id: 1,
              name: 'Bobík'
            },
            can_review: true,
            review_deadline: '2024-01-22T23:59:59Z'
          }
        ]
      }).as('getReviewableBookings')
    })

    it('should write a comprehensive review after completed session', () => {
      const reviewData = {
        booking_id: 1,
        trainer_rating: 5,
        session_rating: 4,
        facility_rating: 5,
        overall_rating: 5,
        comment: 'Výborný tréning! Bobík sa naučil základné povely a Mária bola veľmi trpezlivá a profesionálna.',
        trainer_feedback: 'Mária vysvetlila všetko veľmi jasne a dala nám užitočné rady na precvičovanie doma.',
        improvement_suggestions: 'Možno by bolo dobré mať viac času na precvičovanie',
        would_recommend: true,
        public_review: true
      }

      cy.intercept('POST', '/api/reviews', {
        statusCode: 201,
        body: {
          id: 1,
          ...reviewData,
          created_at: new Date().toISOString(),
          helpful_count: 0
        }
      }).as('submitReview')

      cy.visit('/bookings/reviewable')
      cy.waitForApiCall('@getReviewableBookings')

      cy.getByDataCy('booking-1').should('exist')
      cy.contains('Základný tréning').should('exist')
      cy.contains('Deadline: 22. január').should('exist')

      cy.getByDataCy('write-review-button-1').click()
      cy.url().should('include', '/bookings/1/review')

      // Rating sections
      cy.getByDataCy('trainer-rating-stars').find('[data-value="5"]').click()
      cy.getByDataCy('session-rating-stars').find('[data-value="4"]').click()
      cy.getByDataCy('facility-rating-stars').find('[data-value="5"]').click()

      // Overall rating should calculate automatically
      cy.getByDataCy('overall-rating-display').should('contain', '4.7')

      // Review text
      cy.getByDataCy('review-comment-input').type(reviewData.comment)
      cy.getByDataCy('trainer-feedback-input').type(reviewData.trainer_feedback)
      cy.getByDataCy('improvement-suggestions-input').type(reviewData.improvement_suggestions)

      // Review preferences
      cy.getByDataCy('would-recommend-checkbox').check()
      cy.getByDataCy('public-review-checkbox').check()

      // Submit review
      cy.getByDataCy('submit-review-button').click()
      cy.waitForApiCall('@submitReview')

      cy.contains('Recenzia bola pridaná').should('exist')
      cy.url().should('include', '/reviews')
    })

    it('should write review with photos', () => {
      cy.intercept('POST', '/api/reviews', {
        statusCode: 201,
        body: {
          id: 2,
          photos: [
            'https://example.com/photos/review1.jpg',
            'https://example.com/photos/review2.jpg'
          ]
        }
      }).as('submitReviewWithPhotos')

      cy.visit('/bookings/1/review')

      // Basic review data
      cy.getByDataCy('trainer-rating-stars').find('[data-value="5"]').click()
      cy.getByDataCy('session-rating-stars').find('[data-value="5"]').click()
      cy.getByDataCy('facility-rating-stars').find('[data-value="4"]').click()
      cy.getByDataCy('review-comment-input').type('Skvelý tréning!')

      // Upload photos
      cy.getByDataCy('review-photos-input').selectFile([
        'cypress/fixtures/training-photo1.jpg',
        'cypress/fixtures/training-photo2.jpg'
      ], { force: true })

      // Should show photo previews
      cy.getByDataCy('photo-preview-1').should('be.visible')
      cy.getByDataCy('photo-preview-2').should('be.visible')

      cy.getByDataCy('submit-review-button').click()
      cy.waitForApiCall('@submitReviewWithPhotos')

      cy.contains('Recenzia s fotografiami bola pridaná').should('exist')
    })

    it('should show validation errors for incomplete reviews', () => {
      cy.visit('/bookings/1/review')

      // Try to submit without required fields
      cy.getByDataCy('submit-review-button').click()

      // Should show validation errors
      cy.contains('Hodnotenie trénera je povinné').should('exist')
      cy.contains('Hodnotenie session je povinné').should('exist')
      cy.contains('Komentár je povinný').should('exist')

      // Test minimum comment length
      cy.getByDataCy('trainer-rating-stars').find('[data-value="5"]').click()
      cy.getByDataCy('session-rating-stars').find('[data-value="4"]').click()
      cy.getByDataCy('review-comment-input').type('Krátko')

      cy.getByDataCy('submit-review-button').click()
      cy.contains('Komentár musí mať minimálne 20 znakov').should('exist')
    })

    it('should edit existing review within time limit', () => {
      // Mock existing review
      cy.intercept('GET', '/api/reviews/1', {
        statusCode: 200,
        body: {
          id: 1,
          trainer_rating: 4,
          session_rating: 4,
          facility_rating: 3,
          overall_rating: 3.7,
          comment: 'Pôvodný komentár',
          can_edit: true,
          edit_deadline: '2024-01-16T23:59:59Z'
        }
      }).as('getExistingReview')

      cy.intercept('PUT', '/api/reviews/1', {
        statusCode: 200,
        body: {
          id: 1,
          trainer_rating: 5,
          comment: 'Aktualizovaný komentár po rozmyslení',
          updated_at: new Date().toISOString()
        }
      }).as('updateReview')

      cy.visit('/reviews/1/edit')
      cy.waitForApiCall('@getExistingReview')

      // Should show existing values
      cy.getByDataCy('trainer-rating-stars').should('contain.class', 'rated-4')
      cy.getByDataCy('review-comment-input').should('have.value', 'Pôvodný komentár')

      // Update review
      cy.getByDataCy('trainer-rating-stars').find('[data-value="5"]').click()
      cy.getByDataCy('review-comment-input').clear().type('Aktualizovaný komentár po rozmyslení')

      cy.getByDataCy('update-review-button').click()
      cy.waitForApiCall('@updateReview')

      cy.contains('Recenzia bola aktualizovaná').should('exist')
    })

    it('should prevent review after deadline', () => {
      // Mock expired review opportunity
      cy.intercept('GET', '/api/bookings/1/review-status', {
        statusCode: 422,
        body: {
          message: 'Deadline na recenziu vypršal',
          deadline_passed: true,
          deadline: '2024-01-22T23:59:59Z'
        }
      }).as('checkExpiredReview')

      cy.visit('/bookings/1/review')
      cy.waitForApiCall('@checkExpiredReview')

      cy.contains('Deadline na recenziu vypršal').should('exist')
      cy.contains('22. január 2024').should('exist')
      cy.getByDataCy('submit-review-button').should('not.exist')
    })
  })

  describe('Review Display & Management', () => {
    beforeEach(() => {
      // Mock reviews for display
      cy.intercept('GET', '/api/reviews*', {
        statusCode: 200,
        body: [
          {
            id: 1,
            trainer_rating: 5,
            session_rating: 4,
            facility_rating: 5,
            overall_rating: 4.7,
            comment: 'Výborný tréning! Bobík sa naučil veľa nových vecí.',
            trainer_feedback: 'Mária bola skvelá, veľmi trpezlivá.',
            would_recommend: true,
            public_review: true,
            created_at: '2024-01-16T15:00:00Z',
            helpful_count: 5,
            photos: ['https://example.com/photo1.jpg'],
            session: {
              id: 1,
              name: 'Základný tréning',
              trainer: {
                id: 1,
                name: 'Mária Trénerová'
              }
            },
            dog: {
              id: 1,
              name: 'Bobík',
              breed: 'Nemecký ovčiak'
            },
            owner: {
              id: 1,
              name: 'Ján N.', // Anonymized
              verified: true
            }
          },
          {
            id: 2,
            trainer_rating: 3,
            session_rating: 3,
            facility_rating: 2,
            overall_rating: 2.7,
            comment: 'Tréning bol v poriadku, ale očakával som viac.',
            improvement_suggestions: 'Viac individuálnej pozornosti.',
            would_recommend: false,
            public_review: true,
            created_at: '2024-01-17T10:00:00Z',
            helpful_count: 1,
            session: {
              id: 2,
              name: 'Pokročilý tréning',
              trainer: {
                id: 2,
                name: 'Peter Trenér'
              }
            },
            dog: {
              id: 2,
              name: 'Rex',
              breed: 'Labrádor'
            },
            owner: {
              id: 2,
              name: 'Anna K.',
              verified: true
            }
          }
        ]
      }).as('getReviews')
    })

    it('should display trainer reviews with ratings and comments', () => {
      cy.visit('/trainers/1/reviews')
      cy.waitForApiCall('@getReviews')

      // Should show reviews
      cy.getByDataCy('review-1').should('exist')
      cy.getByDataCy('review-2').should('exist')

      // Check ratings display
      cy.getByDataCy('review-1').should('contain', '4.7/5')
      cy.getByDataCy('review-1').should('contain', '5 hviezdičiek')
      cy.getByDataCy('review-2').should('contain', '2.7/5')

      // Check comments
      cy.contains('Výborný tréning! Bobík sa naučil veľa nových vecí.').should('exist')
      cy.contains('Tréning bol v poriadku, ale očakával som viac.').should('exist')

      // Check reviewer info
      cy.contains('Ján N. (Nemecký ovčiak - Bobík)').should('exist')
      cy.contains('Anna K. (Labrádor - Rex)').should('exist')

      // Check verified badges
      cy.getByDataCy('verified-reviewer-badge-1').should('exist')
      cy.getByDataCy('verified-reviewer-badge-2').should('exist')
    })

    it('should filter reviews by rating and date', () => {
      cy.visit('/trainers/1/reviews')
      cy.waitForApiCall('@getReviews')

      // Filter by rating
      cy.getByDataCy('rating-filter-select').select('4_and_above')
      cy.getByDataCy('review-1').should('exist')
      cy.getByDataCy('review-2').should('not.exist')

      // Filter by rating (low)
      cy.getByDataCy('rating-filter-select').select('3_and_below')
      cy.getByDataCy('review-1').should('not.exist')
      cy.getByDataCy('review-2').should('exist')

      // Clear filter
      cy.getByDataCy('rating-filter-select').select('all')
      cy.getByDataCy('review-1').should('exist')
      cy.getByDataCy('review-2').should('exist')

      // Filter by date
      cy.getByDataCy('date-filter-select').select('last_week')
      // Both reviews should show as they're recent
      cy.getByDataCy('review-1').should('exist')
      cy.getByDataCy('review-2').should('exist')
    })

    it('should mark reviews as helpful', () => {
      cy.loginAsOwner()

      cy.intercept('POST', '/api/reviews/1/helpful', {
        statusCode: 200,
        body: {
          id: 1,
          helpful_count: 6,
          user_found_helpful: true
        }
      }).as('markHelpful')

      cy.visit('/trainers/1/reviews')
      cy.waitForApiCall('@getReviews')

      cy.getByDataCy('review-1').should('contain', '5 ľudí považuje za užitočnú')
      cy.getByDataCy('helpful-button-1').click()

      cy.waitForApiCall('@markHelpful')
      cy.getByDataCy('review-1').should('contain', '6 ľudí považuje za užitočnú')
      cy.getByDataCy('helpful-button-1').should('contain', 'Užitočná ✓')
    })

    it('should report inappropriate reviews', () => {
      cy.loginAsOwner()

      cy.intercept('POST', '/api/reviews/2/report', {
        statusCode: 200,
        body: {
          message: 'Recenzia bola nahlásená na preskúmanie'
        }
      }).as('reportReview')

      cy.visit('/trainers/1/reviews')
      cy.waitForApiCall('@getReviews')

      cy.getByDataCy('review-2').findByDataCy('report-button').click()
      
      // Report modal
      cy.getByDataCy('report-modal').should('be.visible')
      cy.getByDataCy('report-reason-select').select('inappropriate_content')
      cy.getByDataCy('report-details-input').type('Recenzia obsahuje nevhodný obsah')
      
      cy.getByDataCy('submit-report-button').click()
      cy.waitForApiCall('@reportReview')

      cy.contains('Recenzia bola nahlásená na preskúmanie').should('exist')
    })

    it('should show review photos in gallery', () => {
      cy.visit('/trainers/1/reviews')
      cy.waitForApiCall('@getReviews')

      cy.getByDataCy('review-1').findByDataCy('review-photo-1').click()
      
      // Photo gallery should open
      cy.getByDataCy('photo-gallery-modal').should('be.visible')
      cy.getByDataCy('gallery-image').should('be.visible')
      cy.getByDataCy('close-gallery-button').click()
      cy.getByDataCy('photo-gallery-modal').should('not.exist')
    })
  })

  describe('Trainer Review Management', () => {
    beforeEach(() => {
      cy.loginAsTrainer()

      // Mock trainer's reviews
      cy.intercept('GET', '/api/trainer/reviews*', {
        statusCode: 200,
        body: [
          {
            id: 1,
            trainer_rating: 5,
            overall_rating: 4.7,
            comment: 'Výborný tréning!',
            trainer_feedback: 'Mária bola skvelá',
            improvement_suggestions: null,
            created_at: '2024-01-16T15:00:00Z',
            session: {
              id: 1,
              name: 'Základný tréning'
            },
            owner: {
              name: 'Ján N.',
              verified: true
            },
            response: null,
            can_respond: true
          },
          {
            id: 2,
            trainer_rating: 3,
            overall_rating: 2.7,
            comment: 'Očakával som viac',
            improvement_suggestions: 'Viac individuálnej pozornosti',
            created_at: '2024-01-17T10:00:00Z',
            session: {
              id: 2,
              name: 'Pokročilý tréning'
            },
            owner: {
              name: 'Anna K.',
              verified: true
            },
            response: null,
            can_respond: true
          }
        ]
      }).as('getTrainerReviews')
    })

    it('should view trainer\'s own reviews', () => {
      cy.visit('/trainer/reviews')
      cy.waitForApiCall('@getTrainerReviews')

      // Should show reviews received
      cy.contains('Moje recenzie').should('exist')
      cy.getByDataCy('review-1').should('exist')
      cy.getByDataCy('review-2').should('exist')

      // Check review details
      cy.contains('Výborný tréning!').should('exist')
      cy.contains('Očakával som viac').should('exist')
      cy.contains('Základný tréning').should('exist')
      cy.contains('Pokročilý tréning').should('exist')
    })

    it('should respond to reviews', () => {
      const responseData = {
        review_id: 1,
        response: 'Ďakujem za krásnu recenziu! Teším sa, že Bobík robí pokroky. Nezabudnite precvičovať povely aj doma.'
      }

      cy.intercept('POST', '/api/trainer/reviews/1/respond', {
        statusCode: 201,
        body: {
          id: 1,
          response: responseData.response,
          response_date: new Date().toISOString()
        }
      }).as('respondToReview')

      cy.visit('/trainer/reviews')
      cy.waitForApiCall('@getTrainerReviews')

      cy.getByDataCy('review-1').findByDataCy('respond-button').click()
      
      // Response modal
      cy.getByDataCy('response-modal').should('be.visible')
      cy.getByDataCy('response-text-input').type(responseData.response)
      
      // Character counter
      cy.getByDataCy('character-counter').should('contain', '103/500')
      
      cy.getByDataCy('submit-response-button').click()
      cy.waitForApiCall('@respondToReview')

      cy.contains('Odpoveď bola pridaná').should('exist')
    })

    it('should respond to negative review professionally', () => {
      const professionalResponse = {
        review_id: 2,
        response: 'Ďakujem za spätnú väzbu. Mrzí ma, že session nespĺňala vaše očakávania. Rád by som sa s vami osobne porozprával o tom, ako môžem zlepšiť individuálny prístup. Kontaktujte ma prosím.'
      }

      cy.intercept('POST', '/api/trainer/reviews/2/respond', {
        statusCode: 201,
        body: {
          id: 2,
          response: professionalResponse.response
        }
      }).as('respondToNegativeReview')

      cy.visit('/trainer/reviews')
      cy.waitForApiCall('@getTrainerReviews')

      cy.getByDataCy('review-2').findByDataCy('respond-button').click()
      
      // Should show suggested response templates for negative reviews
      cy.getByDataCy('response-templates').should('be.visible')
      cy.getByDataCy('professional-template-button').click()
      
      // Template should fill the textarea
      cy.getByDataCy('response-text-input').should('contain.value', 'Ďakujem za spätnú väzbu')
      
      // Customize the response
      cy.getByDataCy('response-text-input').clear().type(professionalResponse.response)
      
      cy.getByDataCy('submit-response-button').click()
      cy.waitForApiCall('@respondToNegativeReview')

      cy.contains('Odpoveď bola pridaná').should('exist')
    })

    it('should view review analytics and insights', () => {
      cy.intercept('GET', '/api/trainer/review-analytics', {
        statusCode: 200,
        body: {
          average_rating: 4.2,
          total_reviews: 25,
          rating_distribution: {
            5: 12,
            4: 8,
            3: 3,
            2: 1,
            1: 1
          },
          recent_trends: {
            last_30_days: 4.5,
            previous_30_days: 4.0,
            trend: 'improving'
          },
          common_themes: [
            { theme: 'patience', frequency: 18 },
            { theme: 'professional', frequency: 15 },
            { theme: 'effective', frequency: 12 }
          ],
          improvement_areas: [
            'More individual attention',
            'Clearer instructions'
          ]
        }
      }).as('getReviewAnalytics')

      cy.visit('/trainer/analytics/reviews')
      cy.waitForApiCall('@getReviewAnalytics')

      // Should show analytics dashboard
      cy.contains('Analýza recenzií').should('exist')
      cy.contains('4.2/5').should('exist') // Average rating
      cy.contains('25 recenzií').should('exist')

      // Rating distribution chart
      cy.getByDataCy('rating-chart').should('exist')
      cy.contains('12 × 5 hviezdičiek').should('exist')

      // Trends
      cy.contains('Zlepšujúci sa trend').should('exist')
      cy.contains('4.5 (posledných 30 dní)').should('exist')

      // Common themes
      cy.contains('patience (18×)').should('exist')
      cy.contains('professional (15×)').should('exist')

      // Improvement areas
      cy.contains('More individual attention').should('exist')
    })
  })

  describe('Review System Administration', () => {
    beforeEach(() => {
      cy.loginAsAdmin()
    })

    it('should moderate reported reviews', () => {
      // Mock reported reviews
      cy.intercept('GET', '/api/admin/reviews/reported', {
        statusCode: 200,
        body: [
          {
            id: 1,
            comment: 'Tento tréner je úplne neschopný a zlý človek!',
            reported_at: '2024-01-18T10:00:00Z',
            report_reason: 'inappropriate_content',
            report_count: 3,
            status: 'pending_review',
            trainer: {
              id: 1,
              name: 'Mária Trénerová'
            },
            owner: {
              id: 2,
              name: 'Nahnevaný Zákazník'
            }
          }
        ]
      }).as('getReportedReviews')

      cy.intercept('PUT', '/api/admin/reviews/1/moderate', {
        statusCode: 200,
        body: {
          id: 1,
          status: 'removed',
          moderation_note: 'Odstránené kvôli nevhodnému obsahu'
        }
      }).as('moderateReview')

      cy.visit('/admin/reviews/reported')
      cy.waitForApiCall('@getReportedReviews')

      cy.getByDataCy('reported-review-1').should('exist')
      cy.contains('3 nahlásenia').should('exist')
      cy.contains('inappropriate_content').should('exist')

      cy.getByDataCy('moderate-review-button-1').click()
      
      // Moderation modal
      cy.getByDataCy('moderation-modal').should('be.visible')
      cy.getByDataCy('moderation-action-select').select('remove')
      cy.getByDataCy('moderation-note-input').type('Odstránené kvôli nevhodnému obsahu')
      
      cy.getByDataCy('confirm-moderation-button').click()
      cy.waitForApiCall('@moderateReview')

      cy.contains('Recenzia bola odstránená').should('exist')
    })

    it('should manage review system settings', () => {
      cy.intercept('PUT', '/api/admin/review-settings', {
        statusCode: 200,
        body: {
          message: 'Nastavenia recenzií aktualizované'
        }
      }).as('updateReviewSettings')

      cy.visit('/admin/reviews/settings')

      // Review settings
      cy.getByDataCy('review-deadline-days-input').clear().type('7')
      cy.getByDataCy('edit-deadline-hours-input').clear().type('24')
      cy.getByDataCy('require-verification-checkbox').check()
      cy.getByDataCy('auto-publish-checkbox').uncheck()
      cy.getByDataCy('allow-photos-checkbox').check()
      cy.getByDataCy('max-photos-input').clear().type('3')

      cy.getByDataCy('save-settings-button').click()
      cy.waitForApiCall('@updateReviewSettings')

      cy.contains('Nastavenia recenzií aktualizované').should('exist')
    })
  })

  describe('Review Reminders and Notifications', () => {
    it('should send review reminder notifications', () => {
      cy.loginAsOwner()

      // Mock review reminder notification
      cy.intercept('GET', '/api/notifications', {
        statusCode: 200,
        body: [
          {
            id: 1,
            type: 'review_reminder',
            title: 'Napíšte recenziu',
            message: 'Nezabudnite napísať recenziu na Základný tréning s Mária Trénerová',
            data: {
              booking_id: 1,
              session_name: 'Základný tréning',
              trainer_name: 'Mária Trénerová',
              deadline: '2024-01-22T23:59:59Z'
            },
            created_at: '2024-01-20T09:00:00Z',
            read_at: null
          }
        ]
      }).as('getReviewReminders')

      cy.visit('/dashboard')
      cy.getByDataCy('notifications-bell').click()
      cy.waitForApiCall('@getReviewReminders')

      cy.contains('Napíšte recenziu').should('exist')
      cy.contains('Základný tréning').should('exist')
      cy.contains('Deadline: 22. január').should('exist')

      // Should have quick action
      cy.getByDataCy('write-review-quick-button').should('exist')
    })

    it('should send review response notifications to owners', () => {
      cy.loginAsOwner()

      cy.intercept('GET', '/api/notifications', {
        statusCode: 200,
        body: [
          {
            id: 2,
            type: 'review_response',
            title: 'Tréner odpovedal na recenziu',
            message: 'Mária Trénerová odpovedala na vašu recenziu',
            data: {
              review_id: 1,
              trainer_name: 'Mária Trénerová',
              response_preview: 'Ďakujem za krásnu recenziu! Teším sa...'
            },
            created_at: '2024-01-21T14:00:00Z',
            read_at: null
          }
        ]
      }).as('getResponseNotifications')

      cy.visit('/dashboard')
      cy.getByDataCy('notifications-bell').click()
      cy.waitForApiCall('@getResponseNotifications')

      cy.contains('Tréner odpovedal na recenziu').should('exist')
      cy.contains('Mária Trénerová odpovedala').should('exist')
      cy.contains('Ďakujem za krásnu recenziu').should('exist')

      // Should link to review
      cy.getByDataCy('view-response-button').should('exist')
    })
  })
}) 