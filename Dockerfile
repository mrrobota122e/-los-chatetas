# Simple build
FROM node:20-alpine

WORKDIR /app

# Install dependencies for all workspaces
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/
COPY shared/ ./shared/

# Install root dependencies
RUN npm install --legacy-peer-deps || true

# Install client dependencies
WORKDIR /app/client
RUN npm install --legacy-peer-deps || true

# Install server dependencies  
WORKDIR /app/server
RUN npm install --legacy-peer-deps || true

# Copy all source code
WORKDIR /app
COPY client/ ./client/
COPY server/ ./server/

# Build client
WORKDIR /app/client
RUN npm run build 2>/dev/null || true

# Build server
WORKDIR /app/server
RUN npx prisma generate || true
RUN npm run build || true

# Set production mode
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Start
CMD ["node", "dist/index.js"]
