# API Proxy for secure credential management
FROM node:20-alpine

# Install dependencies
RUN apk add --no-cache curl

# Create app directory
WORKDIR /app

# Copy proxy server files
COPY package.json ./
COPY server.js ./

# Install npm dependencies
RUN npm install

# Expose port
EXPOSE 8080

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Run the proxy server
CMD ["node", "server.js"]