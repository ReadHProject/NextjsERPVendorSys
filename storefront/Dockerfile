FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY storefront/package.json ./
RUN npm install

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY storefront ./storefront
RUN cd storefront && npm run build

FROM base AS runner
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 appuser
COPY --from=builder /app/storefront/.next/standalone ./
COPY --from=builder /app/storefront/.next/static ./storefront/.next/static
COPY --from=builder /app/storefront/public ./storefront/public
WORKDIR /app/storefront
USER appuser
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
