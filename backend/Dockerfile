FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY backend/package.json ./
RUN npm install

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY backend ./backend
RUN cd backend && npx prisma generate

FROM base AS runner
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 appuser
COPY --from=builder /app/backend ./backend
COPY --from=builder /app/node_modules ./node_modules
WORKDIR /app/backend
USER appuser
EXPOSE 5000
CMD ["npm", "start"]
