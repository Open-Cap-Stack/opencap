FROM node:20.13.1-alpine3.19

WORKDIR /app

RUN apk add --no-cache python3 make g++ bash

COPY package*.json ./
RUN npm install --no-fund --no-audit --omit=dev && npm cache clean --force
RUN npx playwright install chromium --with-deps

COPY . .

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["node", "app.js"]
