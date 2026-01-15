# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Build-time env (provided via docker-compose build args)
ARG NEXT_PUBLIC_API_BASE
ARG NEXT_PUBLIC_TRON_ADDRESS
ARG NEXT_PUBLIC_BEP20_ADDRESS
ENV NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE
ENV NEXT_PUBLIC_TRON_ADDRESS=$NEXT_PUBLIC_TRON_ADDRESS
ENV NEXT_PUBLIC_BEP20_ADDRESS=$NEXT_PUBLIC_BEP20_ADDRESS

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY next.config.ts ./
COPY tailwind.config.ts ./
COPY postcss.config.js ./

# Install dependencies
RUN npm install

# Copy source
COPY app ./app
COPY i18n.ts ./i18n.ts
COPY messages ./messages
COPY proxy.ts ./proxy.ts
COPY public ./public

# Build Next.js
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Runtime stage
FROM node:22-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm install --omit=dev && \
    npm cache clean --force

# Copy built application and static files
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/app ./app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/en', (res) => { if (res.statusCode !== 200) throw new Error(res.statusCode) })"

# Expose port
EXPOSE 3000

# Use dumb-init to run Node (handles signals properly)
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["npm", "start"]
