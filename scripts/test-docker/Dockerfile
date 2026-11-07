# The image that scripts/test-docker.sh runs the tests in. Its fonts give the
# same text metrics on every host. Pinned by digest, as a tag can be pushed
# again with other contents; its browsers are built for one version of
# playwright, which scripts/test-docker.sh checks.
FROM mcr.microsoft.com/playwright:v1.65.0-noble@sha256:6e3fb709361521eb27161606e6da6d2674e5e89fa16516cb37d6fdd91372273d

# pnpm, installed from package-lock.json.
WORKDIR /opt/pnpm
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund \
  && ln -s /opt/pnpm/node_modules/.bin/pnpm /usr/local/bin/pnpm
