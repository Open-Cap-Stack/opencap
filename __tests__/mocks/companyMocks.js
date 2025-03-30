/**
 * Company Controller Mocks
 * [Bug] OCAE-206: Fix Permission & Role-Based Access Control Tests
 * 
 * Mock implementations for company controller to facilitate RBAC testing
 * following Semantic Seed BDD testing standards.
 */

// Mock company data
const mockCompanies = [
  {
    _id: '60d21b4667d0d8992e610c85',
    name: 'Test Company 1',
    description: 'A test company for RBAC',
    industry: 'Technology',
    foundedYear: 2020,
    website: 'https://example1.com'
  },
  {
    _id: '60d21b4667d0d8992e610c86',
    name: 'Test Company 2',
    description: 'Another test company',
    industry: 'Finance',
    foundedYear: 2021,
    website: 'https://example2.com'
  }
];

// Mock Company controller
const mockCompanyController = {
  // GET /api/companies
  getAllCompanies: jest.fn().mockImplementation((req, res) => {
    return res.status(200).json(mockCompanies);
  }),
  
  // GET /api/companies/:id
  getCompanyById: jest.fn().mockImplementation((req, res) => {
    const company = mockCompanies.find(c => c._id === req.params.id);
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }
    return res.status(200).json(company);
  }),
  
  // POST /api/companies
  createCompany: jest.fn().mockImplementation((req, res) => {
    const newCompany = {
      _id: `mock-id-${Date.now()}`,
      ...req.body
    };
    return res.status(201).json(newCompany);
  }),
  
  // PUT /api/companies/:id
  updateCompanyById: jest.fn().mockImplementation((req, res) => {
    const company = mockCompanies.find(c => c._id === req.params.id);
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }
    
    const updatedCompany = {
      ...company,
      ...req.body
    };
    
    return res.status(200).json(updatedCompany);
  }),
  
  // DELETE /api/companies/:id
  deleteCompanyById: jest.fn().mockImplementation((req, res) => {
    const company = mockCompanies.find(c => c._id === req.params.id);
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }
    
    return res.status(200).json({ message: 'Company deleted successfully' });
  })
};

module.exports = {
  mockCompanies,
  mockCompanyController
};
