# **OpenCap Project Coding Standards**
## **Introduction**
These coding standards guide our development team in building the OpenCap financial management system, focusing on **code quality, security, compliance, and test-driven development**.

---

## **📋 OpenCap Backlog Management**
We use **Shortcut** to manage the OpenCap backlog, with story IDs following the `OCDI-XXX` (Data Infrastructure) and `OCAE-XXX` (API Enhancement) patterns.

### **Backlog Workflow for OpenCap**
1. **Select Story**: Start the top-priority unstarted story in the backlog  
2. **Branch Naming**:  
   - `feature/OCDI-XXX` or `feature/OCAE-XXX` for new features  
   - `bug/OCDI-XXX` or `bug/OCAE-XXX` for bug fixes  
   - `chore/OCDI-XXX` or `chore/OCAE-XXX` for maintenance tasks  
3. **TDD Workflow for OpenCap**:  
   - Write failing tests for endpoints/functionality (`WIP: OCAE-XXX: Red Tests`)
   - Implement code to make tests pass (`WIP: OCAE-XXX: Green Tests`)  
   - Refactor and commit final version (`OCAE-XXX: Implement feature`)  
4. **OpenCap PR Process**:  
   - Mark story "Finished" in Shortcut
   - Create PR with title matching story ID (e.g., "OCAE-301: Add Swagger Documentation")
   - Include complete story details and testing notes in description
   - Ensure Swagger documentation is updated for API changes
   - Review PRs and merge
   - Mark story "Delivered"
5. **Acceptance**: PM reviews and accepts/rejects the story

---

## **📖 OpenCap Story Classification & Estimation**
OpenCap stories follow specific formats and estimation guidelines.

### **Story Classification for OpenCap**
- **[Feature]**: New functionality for OpenCap (e.g., new API endpoints, database models)
- **[Bug]**: Issues in existing OpenCap functionality
- **[Chore]**: Maintenance tasks (e.g., dependency updates, refactoring)

### **OpenCap Story Examples**
- `[Feature] OCAE-123: Add financial report filtering endpoint`
- `[Bug] OCDI-456: Fix inconsistent MongoDB connection handling`
- `[Chore] OCAE-789: Refactor authentication middleware`

### **Story Estimation for OpenCap**
- **0 points**: Simple text changes, minor UI tweaks
- **1 point**: Straightforward tasks (e.g., adding a simple API field)
- **2 points**: More complex but well-defined tasks (e.g., creating a new endpoint)
- **3 points**: Complex tasks requiring multiple components
- **5+ points**: Break into smaller stories

---

## **🎨 OpenCap Coding Style Guidelines**
OpenCap follows strict styling conventions for consistency.

### **Naming Conventions**
- **Variables/Functions**: `camelCase` for JavaScript/Node.js
- **Classes/Components**: `PascalCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Files**: `camelCase.js` for implementation, `camelCase.test.js` for tests

### **Formatting**
- **Indentation**: 4 spaces (no tabs)
- **Line Length**: Maximum 80 characters
- **Semicolons**: Required at end of statements
- **Quotes**: Single quotes for strings

### **Comments and Documentation**
- Every API endpoint must have Swagger documentation
- Every function needs a JSDoc comment explaining purpose, params, and return value
- Complex logic needs inline comments explaining "why" not "what"

---

## **🧪 OpenCap Testing Strategy**
We implement strict TDD/BDD for all OpenCap components.

### **Test Requirements**
- **Code Coverage**: Minimum 80% coverage for new code
- **Test Types**:
  - Unit tests for all services and controllers
  - Integration tests for API endpoints
  - Database model tests
  - Authentication/authorization tests

### **Example OpenCap Test (Jest)**
```javascript
describe('Financial Reports API', () => {
  describe('GET /api/financial-reports', () => {
    it('should return all financial reports for authenticated user', async () => {
      // Test implementation
      const response = await request(app)
        .get('/api/financial-reports')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.length).toBeGreaterThan(0);
    });
    
    it('should return 401 for unauthenticated requests', async () => {
      // Test implementation
    });
  });
});
```

---

## **🔄 OpenCap CI/CD Pipeline**
We maintain automated build, test, and deployment for OpenCap.

### **CI Pipeline Steps**
1. **Build**: Compile and build the application
2. **Lint**: Run ESLint to ensure code quality
3. **Test**: Run unit, integration, and API tests
4. **Security Scan**: Run dependency and code security scans
5. **Documentation**: Generate and validate API documentation

### **Deployment Process**
- **Development**: Automatic deployment from main branch
- **Staging**: Manual promotion from development
- **Production**: Manual promotion from staging with approval

---

## **🔧 OpenCap GitHub Workflow**
Our workflow ensures high code quality and collaboration.

### **Branch Strategy**
- `main`: Protected branch, always deployable
- `feature/OCXX-XXX`: Feature branches (short-lived)
- `bug/OCXX-XXX`: Bug fix branches
- `chore/OCXX-XXX`: Maintenance branches

### **Commit Message Format**
```
# Regular commit
OCAE-301: Add Swagger API Documentation

# Work in progress
WIP: OCAE-301: Initial Swagger setup

# Test-focused commits
WIP: OCAE-301: Red tests for financial reporting endpoints
WIP: OCAE-301: Green tests for financial reporting endpoints
```

### **Daily Commit Requirements**
- All work must be committed at least once daily, even if incomplete
- Use `WIP:` prefix for work-in-progress commits
- Include descriptive messages about what was accomplished

---

## **📊 OpenCap Project Structure**

### **Core Components**
- **API Layer**: Express routes and controllers
- **Service Layer**: Business logic
- **Data Layer**: MongoDB models and repositories
- **Authentication**: JWT-based authentication
- **Documentation**: Swagger API documentation

### **Key Technologies**
- **Backend**: Node.js, Express
- **Database**: MongoDB
- **Testing**: Jest, Supertest
- **Documentation**: Swagger/OpenAPI
- **Project Management**: Shortcut

---

## **🔐 OpenCap Security Standards**

### **Authentication & Authorization**
- All endpoints must require authentication (except public endpoints)
- Role-based access control for sensitive operations
- Proper validation of all input data

### **API Security**
- Input validation on all request parameters
- Proper error handling (no leaking of sensitive information)
- Rate limiting on authentication endpoints
- CORS configuration for allowed origins only

---

## **🧪 Testing the Shortcut Integration**

Before adding the full OpenCap backlog to Shortcut, test the integration with these steps:

1. Create a test script that performs these operations:
   ```javascript
   const shortcut = require('./scripts/shortcut-api');
   
   async function testShortcutIntegration() {
     try {
       // Get workflows
       const workflows = await shortcut.getWorkflows();
       console.log('Workflows:', workflows.map(w => ({ id: w.id, name: w.name })));
       
       // Create test epic
       const epic = await shortcut.createEpic({
         name: 'OpenCap Test Epic',
         description: 'Test epic for validating Shortcut API integration'
       });
       console.log('Test Epic created:', epic);
       
       // Create test story
       const story = await shortcut.createStory({
         name: '[Chore] OCAE-TEST: Test Shortcut Integration',
         description: 'This is a test story to validate our Shortcut API integration',
         type: 'chore',
         workflowStateId: workflows[0].states[0].id,
         epicId: epic.id
       });
       console.log('Test Story created:', story);
       
       return { success: true, epic, story };
     } catch (error) {
       console.error('Test failed:', error);
       return { success: false, error };
     }
   }
   
   testShortcutIntegration();
   ```

2. Run the test script and verify:
   - The test epic is created correctly
   - The test story follows our naming convention
   - The story appears under the correct epic
   - The workflow state is correctly assigned

3. If the test is successful, proceed to create the full OpenCap backlog

---

## **📌 Conclusion**
By following these OpenCap-specific standards and integrating TDD throughout our workflow, we'll build a secure, maintainable financial management system. Regular code reviews and pair programming sessions will ensure these standards are upheld.

---

## **📚 References**
- [Shortcut API Documentation](https://developer.shortcut.com/api/rest/v3)
- [OpenCap Shortcut Integration Guide](/docs/shortcut-integration-guide.md)
- [Shortcut API Integration Script](/scripts/shortcut-api.js)
