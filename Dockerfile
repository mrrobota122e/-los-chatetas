FROM node:20-alpine

WORKDIR /app

# Copy everything
COPY . .

# Install all dependencies including dev deps
WORKDIR /app/server
RUN npm install

WORKDIR /app/client  
RUN npm install
RUN npm run build

# Back to server
WORKDIR /app/server
RUN npx prisma generate

# Set environment
ENV NODE_ENV=production

EXPOSE 3001

# Use tsx to run TypeScript directly (no compile step)
CMD ["npx", "tsx", "src/index.ts"]
