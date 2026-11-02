# The image that scripts/test-docker.sh runs the tests in. Both images are
# pinned by digest, as a tag can be pushed again with other contents.
FROM ghcr.io/pnpm/pnpm:12.14.0@sha256:71202ae73719148f6b6e129ca1e9fa3ceabbc9a037dc34800715606f2b5290a1 AS pnpm

# Its fonts give the same text metrics on every host. Its browsers are built
# for one version of playwright, which scripts/test-docker.sh checks.
FROM mcr.microsoft.com/playwright:v1.64.1-noble@sha256:47b510dd9230bf0b9bfc9b20102241e577ea7a99334ab4c3ca19f19770e9b8ea

# The standalone pnpm, which needs no Node of its own.
COPY --from=pnpm /opt/pnpm /opt/pnpm
RUN ln -s /opt/pnpm/pnpm /usr/local/bin/pnpm
