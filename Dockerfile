FROM node:20-alpine

WORKDIR /app

# Copy shared types first
COPY shared/ ./shared/

# Copy and install server
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm install

# Copy and install client
WORKDIR /app
COPY client/package*.json ./client/
WORKDIR /app/client
RUN npm install

# Copy source files
WORKDIR /app
COPY server/ ./server/
COPY client/ ./client/

# Build client first
WORKDIR /app/client
RUN npm run build

# Setup Prisma and build server
WORKDIR /app/server
RUN npx prisma generate
RUN npx tsc

# Set environment
ENV NODE_ENV=production

EXPOSE 3001

# Start with the port from environment
CMD ["sh", "-c", "node dist/index.js"]
