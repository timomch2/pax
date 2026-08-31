# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=22.23.2

FROM node:${NODE_VERSION}-bookworm-slim AS base

ENV COREPACK_HOME=/opt/corepack \
    NEXT_TELEMETRY_DISABLED=1 \
    YARN_VERSION=4.18.0

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p "${COREPACK_HOME}" \
    && corepack enable \
    && corepack prepare yarn@4.18.0 --activate \
    && chmod -R a+rX "${COREPACK_HOME}"

WORKDIR /workspace/pax

FROM base AS dependencies

COPY package.json yarn.lock .yarnrc.yml ./

RUN --mount=type=cache,target=/root/.yarn/berry/cache \
    yarn install --immutable

FROM dependencies AS builder

COPY . .

ENV NODE_ENV=production \
    NEXT_OUTPUT_MODE=standalone

RUN yarn prisma generate
RUN yarn build
RUN test -f .next/standalone/pax/server.js

FROM builder AS quality

RUN yarn typecheck
RUN yarn lint
RUN yarn test

FROM node:${NODE_VERSION}-bookworm-slim AS runtime

LABEL org.opencontainers.image.source="https://github.com/timomch2/pax" \
      org.opencontainers.image.title="PAX Platform" \
      org.opencontainers.image.description="Praxis Exchange public-health innovation platform"

ENV COREPACK_HOME=/opt/corepack \
    NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    YARN_VERSION=4.18.0

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        openssl \
        python3 \
        python3-boto3 \
        python3-psycopg2 \
        tini \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p "${COREPACK_HOME}" \
    && corepack enable \
    && corepack prepare yarn@4.18.0 --activate \
    && chmod -R a+rX "${COREPACK_HOME}" \
    && groupadd --system --gid 1001 pax \
    && useradd --system --uid 1001 --gid pax --home-dir /app pax

WORKDIR /app

RUN chown pax:pax /app

COPY --from=builder --chown=pax:pax /workspace/pax/.next/standalone/pax ./
COPY --from=builder --chown=pax:pax /workspace/pax/.next/static ./.next/static
COPY --from=builder --chown=pax:pax /workspace/pax/public ./public

# The same final image runs the web server, Prisma commands, TypeScript workers,
# and Python operations jobs. These files are intentionally present at runtime.
COPY --from=builder --chown=pax:pax /workspace/pax/node_modules ./node_modules
COPY --from=builder --chown=pax:pax /workspace/pax/.yarn ./.yarn
COPY --from=builder --chown=pax:pax /workspace/pax/package.json /workspace/pax/yarn.lock /workspace/pax/.yarnrc.yml /workspace/pax/tsconfig.json ./
COPY --from=builder --chown=pax:pax /workspace/pax/prisma ./prisma
COPY --from=builder --chown=pax:pax /workspace/pax/scripts ./scripts
COPY --from=builder --chown=pax:pax /workspace/pax/lib ./lib
COPY --from=builder --chown=pax:pax /workspace/pax/shared ./shared
COPY --from=builder --chown=pax:pax /workspace/pax/app ./app
COPY --from=builder --chown=pax:pax /workspace/pax/components ./components
COPY --from=builder --chown=pax:pax /workspace/pax/hooks ./hooks
COPY --from=builder --chown=pax:pax /workspace/pax/tests ./tests
COPY --from=builder --chown=pax:pax /workspace/pax/types ./types
COPY --from=builder --chown=pax:pax \
    /workspace/pax/.eslintrc.json \
    /workspace/pax/components.json \
    /workspace/pax/middleware.ts \
    /workspace/pax/next-env.d.ts \
    /workspace/pax/next.config.js \
    /workspace/pax/postcss.config.js \
    /workspace/pax/tailwind.config.ts \
    ./
COPY --chown=pax:pax docker/entrypoint.sh /app/docker/entrypoint.sh

RUN chmod 0555 /app/docker/entrypoint.sh

USER pax

EXPOSE 3000
STOPSIGNAL SIGTERM

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/api/health/live').then((response) => { if (!response.ok) process.exit(1); }).catch(() => process.exit(1))"

ENTRYPOINT ["/usr/bin/tini", "--", "/app/docker/entrypoint.sh"]
CMD ["node", "server.js"]
