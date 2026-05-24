FROM node:20-bookworm-slim

WORKDIR /app

# Build tools for native modules + playwright system deps (Debian/bookworm)
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy manifests and install prod deps fresh (no layer reuse from prior Alpine builds)
COPY package*.json ./
RUN npm ci --no-fund --no-audit --omit=dev && npm cache clean --force

# Install Chromium and all its system dependencies via playwright's own installer
# --with-deps uses apt-get; works on Debian/bookworm, not Alpine
RUN npx playwright install chromium --with-deps

COPY . .

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["node", "app.js"]
