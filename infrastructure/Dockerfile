FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY web/package.json web/package.json
COPY ai/package.json ai/package.json
COPY backend/package.json backend/package.json
COPY services/package.json services/package.json
COPY packages/database/package.json packages/database/package.json
RUN npm ci
COPY . .
RUN mkdir -p ai/data
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
RUN npm run build

FROM node:22-alpine AS runtime
# Docker access belongs exclusively to the separate trusted workspace worker.
WORKDIR /app
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000
COPY --from=build --chown=node:node /app/web/.next/standalone ./
# Next's file tracer can omit Sharp's dynamically loaded libvips shared objects.
# Preserve the target-platform optional native packages installed by npm ci.
COPY --from=build --chown=node:node /app/node_modules/@img ./node_modules/@img
COPY --from=build --chown=node:node /app/web/.next/static ./web/.next/static
COPY --from=build --chown=node:node /app/web/public ./web/public
RUN mkdir -p /app/ai/data && chown node:node /app/ai/data
USER node
EXPOSE 3000
CMD ["node", "web/server.js"]
