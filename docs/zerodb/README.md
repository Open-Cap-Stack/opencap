# ZeroDB Documentation

**OpenCap Stack Database Documentation**

This directory contains all documentation related to ZeroDB, the primary database for OpenCap Stack.

## Quick Links

| Document | Description |
|----------|-------------|
| [Migration Guide](./MIGRATION_GUIDE.md) | Step-by-step guide for setting up ZeroDB |
| [API Reference](./API_REFERENCE.md) | Complete ZeroDB API documentation |

## Overview

OpenCap Stack uses ZeroDB (via AINative Studio) as its primary database platform. ZeroDB provides:

- **NoSQL Table Storage**: Flexible schema-less storage for all application data
- **Vector Search**: Semantic search capabilities for documents
- **Memory Management**: Agent context and conversation history
- **Event Streaming**: Real-time event publishing and subscription
- **File Storage**: Document and file metadata management

## Getting Started

### 1. Create a ZeroDB Account

1. Visit [https://api.ainative.studio/](https://api.ainative.studio/)
2. Sign up for an account
3. Generate an API token

### 2. Configure Environment

```bash
# Add to .env file
ZERODB_API_KEY=your_api_key_here
ZERODB_BASE_URL=https://api.ainative.studio/api/v1
ZERODB_PROJECT_ID=your_project_id_here
```

### 3. Initialize Tables

```bash
npm run zerodb:init
```

### 4. Verify Setup

```bash
curl -X GET "https://api.ainative.studio/api/v1/projects/$ZERODB_PROJECT_ID/database/status" \
  -H "Authorization: Bearer $ZERODB_API_KEY"
```

## ZeroDB Tables

OpenCap Stack uses the following ZeroDB tables:

| Table | Description |
|-------|-------------|
| `users` | User accounts and authentication |
| `companies` | Company/organization data |
| `stakeholders` | Shareholders and investors |
| `transactions` | Financial transactions |
| `documents` | Document metadata |
| `share_classes` | Equity share class definitions |
| `financial_reports` | Financial reporting data |
| `compliance_checks` | Regulatory compliance records |
| `tax_calculations` | Tax calculation records |
| `equity_plans` | Equity compensation plans |
| `vesting_schedules` | Vesting configurations |
| `spv` | Special Purpose Vehicles |
| `spv_assets` | SPV asset records |

## Additional Resources

- [Data Models](../DataModels.md) - Complete schema definitions
- [API Documentation](../API_Documentation_Sprint1.md) - REST API endpoints
- [Troubleshooting](../troubleshooting.md) - Common issues and solutions
- [Performance Tuning](../performance-tuning.md) - Optimization guide

## Support

- **AINative Studio Documentation**: https://docs.ainative.studio/
- **GitHub Issues**: https://github.com/Open-Cap-Stack/opencapstack/issues
- **Email**: support@ainative.studio

---

**Last Updated**: 2026-02-02
