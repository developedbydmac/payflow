# PayFlow API image. The app is a small test target, so it runs TypeScript directly with tsx.
FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

# Install production dependencies first, so this layer is cached until package*.json changes.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY tsconfig.json ./
COPY app ./app

EXPOSE 3000
USER node

# Bring the schema up to date, seed if empty (the seed skips itself otherwise), then serve.
# `exec` makes the server PID 1, so `docker compose stop` shuts it down cleanly.
CMD ["sh", "-c", "npx tsx app/db/migrate.ts && npx tsx app/db/seed.ts && exec npx tsx app/api/server.ts"]
