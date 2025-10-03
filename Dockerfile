# Build stage
FROM oven/bun:1-alpine AS builder
WORKDIR /app
COPY package.json bun.lock tsconfig.json ./
RUN bun install --frozen-lockfile
COPY src ./src
RUN bun run build

# Runtime stage
FROM oven/bun:1-alpine AS runtime
RUN apk add --no-cache ffmpeg
WORKDIR /app
COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["bun", "run", "dist/index.js"]