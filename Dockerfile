FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files first
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Copy shared folder
COPY shared ./shared

# Install server dependencies
WORKDIR /app/server
RUN npm install --force

# Install client dependencies and build
WORKDIR /app/client
RUN npm install --force
COPY client ./
RUN npm run build

# Copy server source
WORKDIR /app/server
COPY server ./

# Generate Prisma client
RUN npx prisma generate

# Environment
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Run with tsx
CMD ["npx", "tsx", "src/index.ts"]
