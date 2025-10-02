# REST API Broker for LLPM Agents
FROM node:20-alpine

# Install build dependencies and Docker CLI
RUN apk add --no-cache python3 make g++ docker-cli

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm install --production && \
    npm install && \
    npm cache clean --force

# Copy source code
COPY src ./src
COPY openapi.yaml ./
COPY public ./public

# Build TypeScript
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# Create directory for Unix sockets
RUN mkdir -p /var/run/llpm

# Expose port
EXPOSE 3010

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3010/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Run the application
CMD ["node", "dist/index.js"]