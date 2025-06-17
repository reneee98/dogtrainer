describe('Dog Management CRUD Operations', () => {
  beforeEach(() => {
    cy.cleanupTestData()
    cy.loginAsOwner()
    
    // Mock owner's dogs list
    cy.intercept('GET', '/api/dogs', {
      statusCode: 200,
      body: []
    }).as('getDogs')
  })

  describe('Create Dog', () => {
    it('should successfully create a new dog profile', () => {
      const dogData = {
        name: 'Bobík',
        breed: 'Nemecký ovčiak',
        age: 3,
        size: 'large',
        description: 'Priateľský a aktívny pes, miluje hranie a dlhé precházky.'
      }

      cy.intercept('POST', '/api/dogs', {
        statusCode: 201,
        body: {
          id: 1,
          ...dogData,
          owner_id: 1,
          created_at: new Date().toISOString()
        }
      }).as('createDog')

      cy.intercept('GET', '/api/dogs', {
        statusCode: 200,
        body: [{
          id: 1,
          ...dogData,
          owner_id: 1
        }]
      }).as('getDogsAfterCreate')

      cy.visit('/dogs')
      cy.getByDataCy('add-dog-button').click()
      cy.url().should('include', '/dogs/create')

      // Fill out dog form
      cy.getByDataCy('dog-name-input').type(dogData.name)
      cy.getByDataCy('dog-breed-input').type(dogData.breed)
      cy.getByDataCy('dog-age-input').type(dogData.age.toString())
      cy.getByDataCy('dog-size-select').select(dogData.size)
      cy.getByDataCy('dog-description-input').type(dogData.description)

      // Submit form
      cy.getByDataCy('save-dog-button').click()

      cy.waitForApiCall('@createDog')
      cy.url().should('include', '/dogs')
      cy.contains(dogData.name).should('exist')
      cy.contains(dogData.breed).should('exist')
    })

    it('should upload dog photo during creation', () => {
      const dogData = {
        name: 'Rex',
        breed: 'Labrádor',
        age: 2,
        size: 'large',
        description: 'Veselý a energický pes.'
      }

      cy.intercept('POST', '/api/dogs', {
        statusCode: 201,
        body: {
          id: 2,
          ...dogData,
          photo_url: 'https://example.com/photos/rex.jpg'
        }
      }).as('createDogWithPhoto')

      cy.visit('/dogs/create')

      // Fill basic info
      cy.getByDataCy('dog-name-input').type(dogData.name)
      cy.getByDataCy('dog-breed-input').type(dogData.breed)
      cy.getByDataCy('dog-age-input').type(dogData.age.toString())
      cy.getByDataCy('dog-size-select').select(dogData.size)
      cy.getByDataCy('dog-description-input').type(dogData.description)

      // Upload photo
      cy.getByDataCy('dog-photo-input').selectFile('cypress/fixtures/dog-photo.jpg', { force: true })
      cy.getByDataCy('photo-preview').should('be.visible')

      cy.getByDataCy('save-dog-button').click()
      cy.waitForApiCall('@createDogWithPhoto')

      cy.url().should('include', '/dogs')
      cy.contains(dogData.name).should('exist')
    })

    it('should show validation errors for invalid input', () => {
      cy.visit('/dogs/create')

      // Try to submit empty form
      cy.getByDataCy('save-dog-button').click()

      // Should show validation errors
      cy.contains('Meno psa je povinné').should('exist')
      cy.contains('Plemeno je povinné').should('exist')
      cy.contains('Vek je povinný').should('exist')
      cy.contains('Veľkosť je povinná').should('exist')

      // Test invalid age
      cy.getByDataCy('dog-age-input').type('-1')
      cy.getByDataCy('dog-name-input').click() // Trigger blur
      cy.contains('Vek musí byť kladné číslo').should('exist')

      // Test age too high
      cy.getByDataCy('dog-age-input').clear().type('25')
      cy.getByDataCy('dog-name-input').click()
      cy.contains('Vek nesmie byť vyšší ako 20 rokov').should('exist')
    })

    it('should handle server errors during creation', () => {
      cy.intercept('POST', '/api/dogs', {
        statusCode: 422,
        body: {
          message: 'Validačná chyba',
          errors: {
            name: ['Pes s týmto menom už existuje']
          }
        }
      }).as('createDogError')

      const dogData = {
        name: 'Existujúci pes',
        breed: 'Nemecký ovčiak',
        age: 3,
        size: 'large',
        description: 'Test'
      }

      cy.createDog(dogData)
      cy.waitForApiCall('@createDogError')

      cy.contains('Pes s týmto menom už existuje').should('exist')
      cy.url().should('include', '/dogs/create')
    })
  })

  describe('Read/List Dogs', () => {
    beforeEach(() => {
      // Mock dogs list with multiple dogs
      cy.intercept('GET', '/api/dogs', {
        statusCode: 200,
        body: [
          {
            id: 1,
            name: 'Bobík',
            breed: 'Nemecký ovčiak',
            age: 3,
            size: 'large',
            photo_url: 'https://example.com/photos/bobik.jpg'
          },
          {
            id: 2,
            name: 'Líška',
            breed: 'Border Collie',
            age: 2,
            size: 'medium',
            photo_url: null
          }
        ]
      }).as('getDogsWithData')
    })

    it('should display list of owner\'s dogs', () => {
      cy.visit('/dogs')
      cy.waitForApiCall('@getDogsWithData')

      // Should show both dogs
      cy.contains('Bobík').should('exist')
      cy.contains('Nemecký ovčiak').should('exist')
      cy.contains('Líška').should('exist')
      cy.contains('Border Collie').should('exist')

      // Should show dog cards
      cy.getByDataCy('dog-card-1').should('exist')
      cy.getByDataCy('dog-card-2').should('exist')
    })

    it('should show dog details when clicked', () => {
      cy.intercept('GET', '/api/dogs/1', {
        statusCode: 200,
        body: {
          id: 1,
          name: 'Bobík',
          breed: 'Nemecký ovčiak',
          age: 3,
          size: 'large',
          description: 'Priateľský a aktívny pes',
          photo_url: 'https://example.com/photos/bobik.jpg',
          medical_info: 'Všetky očkovania aktuálne',
          created_at: '2024-01-15T10:00:00Z'
        }
      }).as('getDogDetails')

      cy.visit('/dogs')
      cy.waitForApiCall('@getDogsWithData')

      cy.getByDataCy('dog-card-1').click()
      cy.waitForApiCall('@getDogDetails')

      cy.url().should('include', '/dogs/1')
      cy.contains('Bobík').should('exist')
      cy.contains('Priateľský a aktívny pes').should('exist')
      cy.contains('Všetky očkovania aktuálne').should('exist')
    })

    it('should show empty state when no dogs exist', () => {
      cy.intercept('GET', '/api/dogs', {
        statusCode: 200,
        body: []
      }).as('getEmptyDogs')

      cy.visit('/dogs')
      cy.waitForApiCall('@getEmptyDogs')

      cy.contains('Zatiaľ nemáte žiadnych psov').should('exist')
      cy.getByDataCy('add-first-dog-button').should('exist')
    })

    it('should filter dogs by breed', () => {
      cy.visit('/dogs')
      cy.waitForApiCall('@getDogsWithData')

      cy.getByDataCy('breed-filter-input').type('Border')
      
      // Should only show Border Collie
      cy.contains('Líška').should('exist')
      cy.contains('Bobík').should('not.exist')
    })

    it('should sort dogs by name, age, or breed', () => {
      cy.visit('/dogs')
      cy.waitForApiCall('@getDogsWithData')

      // Sort by name
      cy.getByDataCy('sort-select').select('name')
      cy.get('[data-cy^="dog-card-"]').first().should('contain', 'Bobík')

      // Sort by age
      cy.getByDataCy('sort-select').select('age')
      cy.get('[data-cy^="dog-card-"]').first().should('contain', 'Líška') // younger
    })
  })

  describe('Update Dog', () => {
    beforeEach(() => {
      cy.intercept('GET', '/api/dogs/1', {
        statusCode: 200,
        body: {
          id: 1,
          name: 'Bobík',
          breed: 'Nemecký ovčiak',
          age: 3,
          size: 'large',
          description: 'Pôvodný popis'
        }
      }).as('getDogForEdit')
    })

    it('should successfully update dog information', () => {
      const updatedData = {
        name: 'Bobík Jr.',
        breed: 'Nemecký ovčiak',
        age: 4,
        size: 'large',
        description: 'Aktualizovaný popis psa'
      }

      cy.intercept('PUT', '/api/dogs/1', {
        statusCode: 200,
        body: {
          id: 1,
          ...updatedData
        }
      }).as('updateDog')

      cy.visit('/dogs/1/edit')
      cy.waitForApiCall('@getDogForEdit')

      // Update fields
      cy.getByDataCy('dog-name-input').clear().type(updatedData.name)
      cy.getByDataCy('dog-age-input').clear().type(updatedData.age.toString())
      cy.getByDataCy('dog-description-input').clear().type(updatedData.description)

      cy.getByDataCy('save-dog-button').click()
      cy.waitForApiCall('@updateDog')

      cy.url().should('include', '/dogs/1')
      cy.contains('Profil psa bol aktualizovaný').should('exist')
    })

    it('should update dog photo', () => {
      cy.intercept('POST', '/api/dogs/1/upload-photo', {
        statusCode: 200,
        body: {
          photo_url: 'https://example.com/photos/new-bobik.jpg'
        }
      }).as('updatePhoto')

      cy.visit('/dogs/1/edit')
      cy.waitForApiCall('@getDogForEdit')

      // Upload new photo
      cy.getByDataCy('dog-photo-input').selectFile('cypress/fixtures/new-dog-photo.jpg', { force: true })
      cy.getByDataCy('upload-photo-button').click()

      cy.waitForApiCall('@updatePhoto')
      cy.contains('Fotografia bola aktualizovaná').should('exist')
    })

    it('should delete existing photo', () => {
      cy.intercept('DELETE', '/api/dogs/1/photo', {
        statusCode: 200,
        body: { message: 'Fotografia bola odstránená' }
      }).as('deletePhoto')

      cy.visit('/dogs/1/edit')
      cy.waitForApiCall('@getDogForEdit')

      cy.getByDataCy('delete-photo-button').click()
      cy.getByDataCy('confirm-delete-photo-button').click()

      cy.waitForApiCall('@deletePhoto')
      cy.contains('Fotografia bola odstránená').should('exist')
    })

    it('should show validation errors for invalid updates', () => {
      cy.visit('/dogs/1/edit')
      cy.waitForApiCall('@getDogForEdit')

      // Clear required fields
      cy.getByDataCy('dog-name-input').clear()
      cy.getByDataCy('dog-breed-input').clear()

      cy.getByDataCy('save-dog-button').click()

      cy.contains('Meno psa je povinné').should('exist')
      cy.contains('Plemeno je povinné').should('exist')
    })
  })

  describe('Delete Dog', () => {
    beforeEach(() => {
      cy.intercept('GET', '/api/dogs', {
        statusCode: 200,
        body: [{
          id: 1,
          name: 'Bobík',
          breed: 'Nemecký ovčiak',
          age: 3,
          size: 'large'
        }]
      }).as('getDogsForDelete')
    })

    it('should successfully delete a dog', () => {
      cy.intercept('DELETE', '/api/dogs/1', {
        statusCode: 200,
        body: { message: 'Pes bol odstránený' }
      }).as('deleteDog')

      cy.intercept('GET', '/api/dogs', {
        statusCode: 200,
        body: []
      }).as('getDogsAfterDelete')

      cy.visit('/dogs')
      cy.waitForApiCall('@getDogsForDelete')

      cy.getByDataCy('dog-card-1').findByDataCy('delete-dog-button').click()
      
      // Confirm deletion
      cy.getByDataCy('delete-confirmation-modal').should('be.visible')
      cy.getByDataCy('confirm-delete-input').type('Bobík')
      cy.getByDataCy('confirm-delete-button').click()

      cy.waitForApiCall('@deleteDog')
      cy.contains('Pes bol odstránený').should('exist')
      cy.contains('Bobík').should('not.exist')
    })

    it('should cancel deletion when user cancels', () => {
      cy.visit('/dogs')
      cy.waitForApiCall('@getDogsForDelete')

      cy.getByDataCy('dog-card-1').findByDataCy('delete-dog-button').click()
      cy.getByDataCy('cancel-delete-button').click()

      // Dog should still be visible
      cy.contains('Bobík').should('exist')
      cy.getByDataCy('delete-confirmation-modal').should('not.exist')
    })

    it('should prevent deletion if confirmation text is wrong', () => {
      cy.visit('/dogs')
      cy.waitForApiCall('@getDogsForDelete')

      cy.getByDataCy('dog-card-1').findByDataCy('delete-dog-button').click()
      cy.getByDataCy('confirm-delete-input').type('Wrong Name')
      
      // Button should be disabled
      cy.getByDataCy('confirm-delete-button').should('be.disabled')
    })

    it('should handle deletion errors', () => {
      cy.intercept('DELETE', '/api/dogs/1', {
        statusCode: 400,
        body: {
          message: 'Nemožno odstrániť psa s aktívnymi rezerváciami'
        }
      }).as('deleteError')

      cy.visit('/dogs')
      cy.waitForApiCall('@getDogsForDelete')

      cy.getByDataCy('dog-card-1').findByDataCy('delete-dog-button').click()
      cy.getByDataCy('confirm-delete-input').type('Bobík')
      cy.getByDataCy('confirm-delete-button').click()

      cy.waitForApiCall('@deleteError')
      cy.contains('Nemožno odstrániť psa s aktívnymi rezerváciami').should('exist')
      
      // Dog should still be visible
      cy.contains('Bobík').should('exist')
    })
  })

  describe('Dog Medical Information', () => {
    it('should add and edit medical information', () => {
      const medicalData = {
        vaccinations: 'Všetky povinné očkovania aktuálne',
        allergies: 'Alergia na kurčacie mäso',
        medications: 'Žiadne súčasné lieky',
        notes: 'Pravidelné kontroly u veterinára'
      }

      cy.intercept('PUT', '/api/dogs/1/medical', {
        statusCode: 200,
        body: {
          id: 1,
          medical_info: medicalData
        }
      }).as('updateMedical')

      cy.visit('/dogs/1/medical')

      cy.getByDataCy('vaccinations-input').type(medicalData.vaccinations)
      cy.getByDataCy('allergies-input').type(medicalData.allergies)
      cy.getByDataCy('medications-input').type(medicalData.medications)
      cy.getByDataCy('medical-notes-input').type(medicalData.notes)

      cy.getByDataCy('save-medical-button').click()
      cy.waitForApiCall('@updateMedical')

      cy.contains('Zdravotné informácie boli aktualizované').should('exist')
    })
  })

  describe('Dog Booking History', () => {
    it('should display dog\'s booking history', () => {
      cy.intercept('GET', '/api/dogs/1/bookings', {
        statusCode: 200,
        body: [
          {
            id: 1,
            session: {
              name: 'Základný tréning',
              date: '2024-01-20T10:00:00Z'
            },
            status: 'completed'
          },
          {
            id: 2,
            session: {
              name: 'Pokročilý tréning',
              date: '2024-01-25T14:00:00Z'
            },
            status: 'confirmed'
          }
        ]
      }).as('getDogBookings')

      cy.visit('/dogs/1/bookings')
      cy.waitForApiCall('@getDogBookings')

      cy.contains('Základný tréning').should('exist')
      cy.contains('Pokročilý tréning').should('exist')
      cy.contains('Dokončené').should('exist')
      cy.contains('Potvrdené').should('exist')
    })
  })
}) 