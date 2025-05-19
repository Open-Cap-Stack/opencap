#!/bin/bash

# Navigate to project root
cd "$(dirname "$0")/.."

echo "🔧 Fixing import paths..."
node scripts/fix-import-paths.js

echo "🔄 Fixing route registrations..."
# Fix route registrations in app.js
sed -i.bak "s|require('\\.\\./models/|require('../../models/|g" app.js

# Fix route registrations in route files
find routes/v1 -type f -name "*.js" -exec sed -i.bak "s|require('\\.\\./models/|require('../../models/|g" {} \;
find routes/v1 -type f -name "*.js" -exec sed -i.bak "s|require('\\.\\./controllers/|require('../../controllers/|g" {} \;

# Clean up backup files
find . -name "*.bak" -delete

echo "🔄 Restarting Docker containers..."
docker-compose down
docker-compose up -d

echo "✅ Done! Containers are restarting with fixed paths and route registrations."
echo "Use 'docker-compose logs -f app' to monitor the logs."
echo ""
echo "To test the API, try these endpoints:"
echo "  GET /api/v1/user"
echo "  GET /api/v1/spv"
echo "  GET /api/v1/document"
echo "  GET /api/v1/compliance-checks"
