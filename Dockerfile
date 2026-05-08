# ── Stage 1: Build Next.js frontend ──────────────────────────────────────────
FROM node:20.13.1-alpine3.19 AS frontend-builder

WORKDIR /app/client

COPY client/package*.json ./
RUN npm install --no-fund --no-audit

COPY client/ ./

# Build Next.js — NEXT_PUBLIC vars must be set at build time
ARG NEXT_PUBLIC_GA_MEASUREMENT_ID=G-KYCXJ4D8M8
ARG NEXT_PUBLIC_SITE_URL=https://opencapstack.com
ARG NEXT_PUBLIC_API_URL=/api/v1
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID
ARG NEXT_PUBLIC_GITHUB_CLIENT_ID
ARG NEXT_PUBLIC_LINKEDIN_CLIENT_ID
ARG NEXT_PUBLIC_AINATIVE_URL=https://ainative.studio

ENV NEXT_PUBLIC_GA_MEASUREMENT_ID=$NEXT_PUBLIC_GA_MEASUREMENT_ID
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID
ENV NEXT_PUBLIC_GITHUB_CLIENT_ID=$NEXT_PUBLIC_GITHUB_CLIENT_ID
ENV NEXT_PUBLIC_LINKEDIN_CLIENT_ID=$NEXT_PUBLIC_LINKEDIN_CLIENT_ID
ENV NEXT_PUBLIC_AINATIVE_URL=$NEXT_PUBLIC_AINATIVE_URL

RUN npm run build

# ── Stage 2: Production image ─────────────────────────────────────────────────
FROM node:20.13.1-alpine3.19

WORKDIR /app

# Install system deps + process manager
RUN apk add --no-cache python3 make g++ && \
    npm install -g concurrently

# Install backend deps
COPY package*.json ./
RUN npm install --no-fund --no-audit --omit=dev && npm cache clean --force

# Copy backend source
COPY . .

# Copy built Next.js app
COPY --from=frontend-builder /app/client/.next ./client/.next
COPY --from=frontend-builder /app/client/public ./client/public
COPY --from=frontend-builder /app/client/node_modules ./client/node_modules
COPY --from=frontend-builder /app/client/package.json ./client/package.json
COPY --from=frontend-builder /app/client/next.config.js ./client/next.config.js

ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_PORT=5173

EXPOSE 3000
EXPOSE 5173

# Run backend (port 3000) + Next.js (port 5173) together
CMD ["concurrently", \
     "--names", "api,web", \
     "--prefix-colors", "blue,green", \
     "node app.js", \
     "cd client && node_modules/.bin/next start -p 5173"]
