# Use Node.js LTS as the base image
FROM node:20.13.1-alpine3.19

# Set the working directory inside the container
WORKDIR /app

# Set environment variables
ENV NODE_ENV=development
ENV PORT=5000

# Install system dependencies
RUN apk add --no-cache python3 make g++

# Create a non-root user and set permissions
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy package files and install dependencies as root
COPY package*.json ./

# Install dependencies with clean cache
RUN npm install --no-package-lock --no-fund --no-audit && \
    npm cache clean --force

# Install nodemon globally for development
RUN npm install -g nodemon

# Copy the rest of the application code and set permissions
COPY --chown=appuser:appgroup . .

# Ensure the app user has write access to necessary directories
RUN chown -R appuser:appgroup /app/node_modules

# Switch to non-root user
USER appuser

# Expose the app's running port
EXPOSE 5000

# Command to run the app
CMD ["npm", "start"]
