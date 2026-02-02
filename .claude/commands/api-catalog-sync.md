You are tasked with synchronizing the AINative Studio API catalog from the production OpenAPI specification.

## What to do:

1. **Run the catalog generator script:**
   ```bash
   python3 scripts/catalog_apis.py
   ```

2. **Review the generated documentation** in `.ainative/api-catalog/`:
   - Check INDEX.md for the category overview
   - Verify key categories have been updated

3. **Report the results:**
   - Total endpoints cataloged
   - Number of categories
   - Any new categories detected
   - Files created/updated

## Expected Output:

The script will:
- Fetch the latest OpenAPI spec from `https://api.ainative.studio/v1/openapi.json`
- Parse and categorize all endpoints
- Generate markdown files for each category
- Create an INDEX.md with navigation

## For AI Agents:

After running this command, agents can browse the `.ainative/api-catalog/` directory to:
- Discover available APIs by category
- Find endpoints for specific tasks
- Understand request/response formats
- Build integrations using documented endpoints

Run this command whenever the API changes to keep documentation fresh.
