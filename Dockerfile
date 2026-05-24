FROM node:20-bookworm-slim

WORKDIR /app

# Build tools for native modules + playwright system deps (Debian)
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy manifests and install prod deps (playwright is in dependencies, not devDependencies)
COPY package*.json ./
RUN npm ci --no-fund --no-audit --omit=dev && npm cache clean --force

# Install Chromium and all its system dependencies via playwright's own installer
# This works correctly on Debian/bookworm and handles all shared library deps
RUN npx playwright install chromium --with-deps

COPY . .

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["node", "app.js"]

# cache-bust: 2026-05-24
