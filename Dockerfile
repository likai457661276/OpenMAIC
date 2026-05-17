# ---- Stage 1: Base ----
FROM node:22-alpine AS base

# 国内镜像源
ARG ALPINE_MIRROR=https://mirrors.aliyun.com/alpine
ARG NPM_REGISTRY=https://registry.npmmirror.com

ENV COREPACK_NPM_REGISTRY=${NPM_REGISTRY} \
    NPM_CONFIG_REGISTRY=${NPM_REGISTRY} \
    PNPM_REGISTRY=${NPM_REGISTRY}

# 切换 apk 镜像源
RUN sed -i "s|https://dl-cdn.alpinelinux.org/alpine|${ALPINE_MIRROR}|g" /etc/apk/repositories

# 安装基础兼容库
RUN apk add --no-cache libc6-compat

# npm/pnpm 配置
RUN npm config set registry "${NPM_REGISTRY}" && \
    corepack enable && \
    corepack prepare pnpm@10.28.0 --activate && \
    pnpm config set registry "${NPM_REGISTRY}"

WORKDIR /app

# ---- Stage 2: Dependencies ----
FROM base AS deps

# 临时安装编译依赖
RUN apk add --no-cache --virtual .build-deps \
    python3 \
    build-base \
    g++ \
    libc6-compat \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    giflib-dev \
    librsvg-dev

# 拷贝 package 文件
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ ./packages/

# 安装依赖
RUN pnpm install --frozen-lockfile

# 删除临时 build 工具，减小镜像
RUN apk del .build-deps

# ---- Stage 3: Builder ----
FROM base AS builder

# 拷贝 deps 阶段的 node_modules
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY . .

# 构建项目
RUN pnpm build

# ---- Stage 4: Runner ----
FROM node:22-alpine AS runner

ARG ALPINE_MIRROR=https://mirrors.aliyun.com/alpine

WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=10050

# 切换国内源
RUN sed -i "s|https://dl-cdn.alpinelinux.org/alpine|${ALPINE_MIRROR}|g" /etc/apk/repositories

# 安装运行依赖
RUN apk add --no-cache libc6-compat cairo pango jpeg giflib librsvg

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 拷贝构建产物
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 10050

CMD ["node", "server.js"]