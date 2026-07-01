describe('ResuLens E2E Testing', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('successfully loads the application', () => {
    cy.contains('ResuLens').should('exist');
  });

  it('can navigate to the features tab', () => {
    cy.contains('Take the Feature Tour').click();
    cy.contains('Step 1').should('exist');
  });

  it('displays error for invalid file uploads', () => {
    cy.get('input[type="file"]').selectFile({
      contents: Cypress.Buffer.from('invalid file'),
      fileName: 'test.txt',
      mimeType: 'text/plain',
    }, { force: true });
    
    cy.contains('Only PDF and DOCX files are allowed.').should('exist');
  });
});
