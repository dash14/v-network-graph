# The image that scripts/test-docker.sh runs the tests in. Its fonts give the
# same text metrics on every host. Pinned by digest, as a tag can be pushed
# again with other contents; its browsers are built for one version of
# playwright, which scripts/test-docker.sh checks.
FROM mcr.microsoft.com/playwright:v1.64.1-noble@sha256:47b510dd9230bf0b9bfc9b20102241e577ea7a99334ab4c3ca19f19770e9b8ea

# pnpm, installed from package-lock.json.
WORKDIR /opt/pnpm
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund \
  && ln -s /opt/pnpm/node_modules/.bin/pnpm /usr/local/bin/pnpm
