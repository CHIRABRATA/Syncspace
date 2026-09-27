# Use official lightweight Node.js image
FROM node:22-alpine

# Set working directory inside container
WORKDIR /app

# Copy dependency manifests first for efficient Docker layer caching
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy application source code
COPY . .

# Expose internal app port
EXPOSE 3000

# Start server
CMD ["node", "src/app.js"]