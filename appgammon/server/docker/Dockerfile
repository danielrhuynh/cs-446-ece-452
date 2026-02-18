FROM node:25-slim AS base
RUN npm install -g pnpm

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

COPY server/package.json server/
COPY packages/common/package.json packages/common/

RUN pnpm install --frozen-lockfile

COPY server/ server/
COPY packages/common/ packages/common/
EXPOSE 3000

CMD ["pnpm", "--filter", "server", "run", "start"]
