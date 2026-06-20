# ---- Stage 1: Base ----
FROM node:22-alpine AS base

ARG ALPINE_MIRROR=https://mirrors.aliyun.com/alpine
ARG NPM_REGISTRY=https://registry.npmmirror.com

ENV COREPACK_NPM_REGISTRY=${NPM_REGISTRY} \
    NPM_CONFIG_REGISTRY=${NPM_REGISTRY} \
    PNPM_REGISTRY=${NPM_REGISTRY}

RUN sed -i "s|https://dl-cdn.alpinelinux.org/alpine|${ALPINE_MIRROR}|g" /etc/apk/repositories
RUN apk add --no-cache libc6-compat
RUN npm config set registry "${NPM_REGISTRY}" && \
    corepack enable && \
    corepack prepare pnpm@10.28.0 --activate && \
    pnpm config set registry "${NPM_REGISTRY}"

WORKDIR /app

# ---- Stage 2: Dependencies ----
FROM base AS deps

# Native build tools for sharp, @napi-rs/canvas
RUN apk add --no-cache python3 build-base g++ cairo-dev pango-dev jpeg-dev giflib-dev librsvg-dev

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ ./packages/
COPY scripts/ ./scripts/

RUN pnpm install --frozen-lockfile

# ---- Stage 3: Builder ----
FROM base AS builder

ARG NEXT_PUBLIC_MAIC_EDITOR_ENABLED=0
ENV NEXT_PUBLIC_MAIC_EDITOR_ENABLED=${NEXT_PUBLIC_MAIC_EDITOR_ENABLED}

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY . .
COPY --from=deps /app/public/vendor/maic-importer ./public/vendor/maic-importer

RUN pnpm build

# ---- Stage 4: Runner ----
FROM node:22-alpine AS runner

ARG ALPINE_MIRROR=https://mirrors.aliyun.com/alpine

WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=10050

RUN sed -i "s|https://dl-cdn.alpinelinux.org/alpine|${ALPINE_MIRROR}|g" /etc/apk/repositories
RUN apk add --no-cache libc6-compat cairo pango jpeg giflib librsvg su-exec

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    mkdir -p /app/data && \
    chown nextjs:nodejs /app/data

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

EXPOSE 10050

CMD ["sh", "-c", "chown -R nextjs:nodejs /app/data && exec su-exec nextjs:nodejs node server.js"]
