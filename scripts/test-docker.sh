#!/bin/sh
# Runs the tests in the Playwright image, whose fonts give the same text
# metrics on every host. The arguments are passed to vitest.
set -eu

cd "$(dirname "$0")/.."

dockerfile=scripts/test-docker.Dockerfile

# The image's browsers are built for one version of playwright, and its
# pnpm is the one that devEngines names. Renovate updates the images without
# waiting for minimumReleaseAge, so they wait here for the packages.
playwright=$(sed -n 's/^  playwright@\([0-9.]*\):$/\1/p' pnpm-lock.yaml | head -n 1)
if ! grep -q "^FROM mcr\.microsoft\.com/playwright:v$playwright-noble@" "$dockerfile"; then
  echo "$dockerfile is not for playwright ${playwright:-?} in pnpm-lock.yaml" >&2
  exit 1
fi
pnpm=$(sed -n '/"packageManager": {/,/}/s/^ *"version": "\(.*\)",$/\1/p' package.json)
if ! grep -q "^FROM ghcr\.io/pnpm/pnpm:$pnpm@" "$dockerfile"; then
  echo "$dockerfile is not for pnpm ${pnpm:-?} in devEngines" >&2
  exit 1
fi

# Built without a context, as the image takes no files from the checkout.
image=v-network-graph-test-docker
docker build -q -t "$image" - < "$dockerfile" >/dev/null

# The host's node_modules holds native binaries for the host, so the
# container keeps its own, one per checkout.
volume="v-network-graph-node-modules-$(pwd | cksum | cut -d ' ' -f 1)"

tty=""
if [ -t 1 ]; then tty="-t"; fi

# The tests run on a copy of the checkout: served from a bind mount, test
# files intermittently fail to load when several run in parallel. The
# snapshots the run writes, and the images of failed screenshot comparisons
# in .vitest/, are copied back, owned by the owner of the checkout.
exec docker run --rm -i $tty \
  --ipc=host \
  -e CI \
  -e VNG_DOCKER=1 \
  -v "$(pwd)":/src \
  -v "$volume":/work/node_modules \
  -v v-network-graph-pnpm-store:/pnpm-store \
  "$image" \
  sh -c 'set -e
    cd /src && tar cf - --exclude=./node_modules --exclude=./.git --exclude=./.vitest . | tar xf - -C /work
    cd /work
    pnpm install --frozen-lockfile --ignore-scripts --store-dir /pnpm-store \
      --config.confirmModulesPurge=false >/dev/null
    status=0
    pnpm exec vitest run "$@" || status=$?
    owner=$(stat -c %u:%g /src)
    cp -R -u --preserve=timestamps test/. /src/test/
    if [ -d .vitest ]; then cp -R --preserve=timestamps .vitest /src/; fi
    chown -R "$owner" /src/test /src/.vitest 2>/dev/null || true
    exit $status' vitest "$@"
