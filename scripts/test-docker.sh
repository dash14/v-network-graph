#!/bin/sh
# Runs the tests in the Playwright image, whose fonts give the same text
# metrics on every host. The arguments are passed to vitest.
set -eu

cd "$(dirname "$0")/.."

version=$(sed -n 's/^  playwright@\([0-9.]*\):$/\1/p' pnpm-lock.yaml | head -n 1)
if [ -z "$version" ]; then
  echo "playwright is not in pnpm-lock.yaml" >&2
  exit 1
fi

# The host's node_modules holds native binaries for the host, so the
# container keeps its own, one per checkout.
volume="v-network-graph-node-modules-$(pwd | cksum | cut -d ' ' -f 1)"

tty=""
if [ -t 1 ]; then tty="-t"; fi

# The tests run on a copy of the checkout: served from a bind mount, test
# files intermittently fail to load when several run in parallel. Only the
# snapshots the run writes are copied back.
exec docker run --rm -i $tty \
  --ipc=host \
  -e CI \
  -e VNG_DOCKER=1 \
  -e COREPACK_HOME=/pnpm-store/corepack \
  -e COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
  -v "$(pwd)":/src \
  -v "$volume":/work/node_modules \
  -v v-network-graph-pnpm-store:/pnpm-store \
  "mcr.microsoft.com/playwright:v$version-noble" \
  sh -c 'set -e
    cd /src && tar cf - --exclude=./node_modules --exclude=./.git . | tar xf - -C /work
    cd /work
    corepack enable
    pnpm install --frozen-lockfile --ignore-scripts --store-dir /pnpm-store \
      --config.confirmModulesPurge=false >/dev/null
    status=0
    pnpm exec vitest run "$@" || status=$?
    cp -a -u test/. /src/test/
    exit $status' vitest "$@"
