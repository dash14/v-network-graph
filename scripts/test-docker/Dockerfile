# The image that scripts/test-docker.sh runs the tests in. Its fonts give the
# same text metrics on every host. Pinned by digest, as a tag can be pushed
# again with other contents; its browsers are built for one version of
# playwright, which scripts/test-docker.sh checks.
FROM mcr.microsoft.com/playwright:v1.65.1-noble@sha256:1507cbfc550a63a6b7396791ca4f00df17beb56342d2447b3f106c306f525579

# pnpm, installed from package-lock.json.
WORKDIR /opt/pnpm
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund \
  && ln -s /opt/pnpm/node_modules/.bin/pnpm /usr/local/bin/pnpm
