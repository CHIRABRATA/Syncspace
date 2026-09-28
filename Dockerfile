# Use official lightweight Node.js image
FROM node:22-alpine

# Set working directory inside container
WORKDIR /app

# Copy dependency manifests first for efficient Docker layer caching
COPY package.json package-lock.json* ./

# Install production dependencies using modern npm syntax
RUN npm install --omit=dev

# Copy application source code
COPY . .

# Expose internal app port
EXPOSE 3000

# Start server
CMD ["node", "src/app.js"]