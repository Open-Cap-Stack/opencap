/**
 * Swagger Documentation Middleware
 * Feature: OCAE-210: Create comprehensive Swagger documentation
 * 
 * This middleware configures and serves Swagger/OpenAPI documentation
 * for the OpenCap API, making it accessible at /api-docs.
 */
const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const fs = require('fs');
const path = require('path');

// Load package.json for API information
const { version, description } = require('../package.json');

// Define base swagger documentation
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'OpenCap API Documentation',
    version,
    description,
    license: {
      name: 'ISC',
      url: 'https://opensource.org/licenses/ISC',
    },
    contact: {
      name: 'OpenCap Support',
      url: 'https://github.com/Open-Cap-Stack/opencap',
      email: 'support@opencap.com',
    },
  },
  servers: [
    {
      url: '/api',
      description: 'Default API server',
    },
    {
      url: '/api/v1',
      description: 'Version 1 API server',
    },
  ],
  components: {
    parameters: {
      PageParam: {
        name: 'page',
        in: 'query',
        description: 'Page number for pagination',
        schema: {
          type: 'integer',
          minimum: 1,
          default: 1
        }
      },
      LimitParam: {
        name: 'limit',
        in: 'query',
        description: 'Number of items per page',
        schema: {
          type: 'integer',
          minimum: 1,
          maximum: 100,
          default: 10
        }
      },
      SortParam: {
        name: 'sort',
        in: 'query',
        description: 'Sort field and direction (e.g., createdAt:desc)',
        schema: {
          type: 'string'
        }
      }
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
            description: 'Error message',
          },
          stack: {
            type: 'string',
            description: 'Error stack trace (development only)',
          },
        },
      },
      User: {
        type: 'object',
        properties: {
          _id: {
            type: 'string',
            description: 'User unique identifier',
          },
          name: {
            type: 'string',
            description: 'User full name',
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'User email address',
          },
          role: {
            type: 'string',
            enum: ['user', 'admin'],
            description: 'User role',
          },
        },
      },
      Pagination: {
        type: 'object',
        properties: {
          total: {
            type: 'integer',
            description: 'Total number of items'
          },
          page: {
            type: 'integer',
            description: 'Current page number'
          },
          limit: {
            type: 'integer',
            description: 'Number of items per page'
          },
          pages: {
            type: 'integer',
            description: 'Total number of pages'
          }
        }
      },
      ShareClass: {
        type: 'object',
        properties: {
          _id: {
            type: 'string',
            description: 'Share class unique identifier'
          },
          name: {
            type: 'string',
            description: 'Share class name'
          },
          companyId: {
            type: 'string',
            description: 'Associated company ID'
          },
          classification: {
            type: 'string',
            description: 'Share class classification (e.g., Common, Preferred)'
          },
          authorizedShares: {
            type: 'number',
            description: 'Number of authorized shares'
          },
          parValue: {
            type: 'number',
            description: 'Par value per share'
          },
          votingRights: {
            type: 'boolean',
            description: 'Whether this share class has voting rights'
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Creation timestamp'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Last update timestamp'
          }
        }
      },
      ShareClassInput: {
        type: 'object',
        required: ['name', 'companyId', 'classification'],
        properties: {
          name: {
            type: 'string',
            description: 'Share class name'
          },
          companyId: {
            type: 'string',
            description: 'Associated company ID'
          },
          classification: {
            type: 'string',
            description: 'Share class classification (e.g., Common, Preferred)'
          },
          authorizedShares: {
            type: 'number',
            description: 'Number of authorized shares'
          },
          parValue: {
            type: 'number',
            description: 'Par value per share'
          },
          votingRights: {
            type: 'boolean',
            description: 'Whether this share class has voting rights'
          }
        }
      },
      FinancialReport: {
        type: 'object',
        properties: {
          _id: {
            type: 'string',
            description: 'Financial report unique identifier'
          },
          title: {
            type: 'string',
            description: 'Report title'
          },
          reportType: {
            type: 'string',
            description: 'Type of financial report'
          },
          period: {
            type: 'string',
            description: 'Reporting period'
          },
          companyId: {
            type: 'string',
            description: 'Associated company ID'
          },
          authorId: {
            type: 'string',
            description: 'ID of the user who created the report'
          },
          data: {
            type: 'object',
            description: 'Financial data contained in the report'
          },
          status: {
            type: 'string',
            enum: ['draft', 'submitted', 'approved', 'rejected'],
            description: 'Current status of the report'
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Creation timestamp'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Last update timestamp'
          }
        }
      },
      FinancialReportInput: {
        type: 'object',
        required: ['title', 'reportType', 'period', 'companyId'],
        properties: {
          title: {
            type: 'string',
            description: 'Report title'
          },
          reportType: {
            type: 'string',
            description: 'Type of financial report'
          },
          period: {
            type: 'string',
            description: 'Reporting period'
          },
          companyId: {
            type: 'string',
            description: 'Associated company ID'
          },
          data: {
            type: 'object',
            description: 'Financial data contained in the report'
          },
          status: {
            type: 'string',
            enum: ['draft', 'submitted', 'approved', 'rejected'],
            description: 'Current status of the report',
            default: 'draft'
          }
        }
      }
    },
    responses: {
      NotFound: {
        description: 'The specified resource was not found',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
          },
        },
      },
      Unauthorized: {
        description: 'Authentication is required to access this resource',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
          },
        },
      },
      BadRequest: {
        description: 'The request contains invalid parameters',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
          },
        },
      },
      InternalServerError: {
        description: 'An internal server error occurred',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
          },
        },
      },
    },
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
  // Mock paths for test purposes - we'll merge with actual paths from yaml files
  paths: {
    '/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Login a user',
        operationId: 'loginUser',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', format: 'password' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    token: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register a new user',
        operationId: 'registerUser',
        responses: {
          '201': {
            description: 'User created successfully',
          },
        },
      },
    },
    '/api/spvs': {
      get: {
        tags: ['SPV Management'],
        summary: 'Get all SPVs',
        operationId: 'getSPVs',
        responses: {
          '200': {
            description: 'List of SPVs retrieved successfully',
          },
        },
      },
    },
    '/api/documents': {
      get: {
        tags: ['Document Management'],
        summary: 'Get all documents',
        operationId: 'getDocuments',
        responses: {
          '200': {
            description: 'List of documents retrieved successfully',
          },
        },
      },
    },
  },
};

// Options for the swagger docs
const options = {
  swaggerDefinition,
  // Paths to files containing OpenAPI definitions
  apis: [
    './routes/*.js',
    './routes/v1/*.js',
    './controllers/*.js',
    './controllers/v1/*.js',
    './models/*.js',
    './middleware/*.js',
    './docs/swagger/*.yaml',
  ],
};

// Initialize swagger-jsdoc
const swaggerSpec = swaggerJSDoc(options);

// Ensure the swagger docs directory exists
const swaggerDocsDir = path.join(__dirname, '../docs/swagger');
if (!fs.existsSync(swaggerDocsDir)) {
  fs.mkdirSync(swaggerDocsDir, { recursive: true });
}

// Save the generated Swagger spec to a file for reference
fs.writeFileSync(
  path.join(swaggerDocsDir, 'openapi-spec.json'),
  JSON.stringify(swaggerSpec, null, 2)
);

/**
 * Set up Swagger documentation middleware
 * @param {Object} app - Express application
 */
const setupSwagger = (app) => {
  if (!app) {
    console.error('Express app instance is required to setup Swagger');
    return;
  }

  // Setup Swagger UI middleware
  console.log('Setting up Swagger UI at /api-docs');
  app.use('/api-docs', swaggerUi.serve);
  app.get('/api-docs', swaggerUi.setup(swaggerSpec, {
    explorer: true,
    swaggerOptions: {
      docExpansion: 'none', // Collapse all sections by default
      filter: true,         // Enable filtering
      displayRequestDuration: true // Show API call duration
    }
  }));

  // Setup Swagger JSON endpoint
  console.log('Setting up Swagger JSON endpoint at /api-docs.json');
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
  
  // Add a redirect from root to Swagger docs for convenience
  app.get('/', (req, res) => {
    res.redirect('/api-docs');
  });

  console.log('🚀 Swagger documentation available at /api-docs');
};

module.exports = {
  setupSwagger,
  swaggerSpec,
};
