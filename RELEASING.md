# Releasing

Releases are published to npm by the `Release` workflow in GitHub Actions, never from a local
machine. It publishes with npm Trusted Publishing, so no npm token is stored anywhere, and npm
attaches a provenance attestation that links the package to the workflow run that built it.

## Steps

1. Bump `version` in `package.json` through a pull request and merge it into `main`.
2. Run the `Release` workflow from `main` (Actions > Release > Run workflow), giving the version
   as a tag, for example `v1.2.3` or `v1.2.3-beta.1`.
3. The workflow checks the tag, then builds and tests the package. Approve the deployment to the
   `release` environment when it asks.
4. The workflow creates a draft GitHub Release with generated notes and the package tarball
   attached, publishes the same tarball to npm, then publishes the release, which creates the tag.
   If the npm publish fails, the draft is deleted. If only publishing the release fails, the draft
   is kept and can be published by hand.

A version with a prerelease part (`v1.2.3-beta.1`) is published under the `next` dist-tag instead
of `latest`, and its GitHub Release is marked as a prerelease.

## Verifying a release

Check that a published version carries a provenance attestation. Run it outside this repository,
since npm refuses to run in a project whose `devEngines` names pnpm:

```sh
npm view v-network-graph@1.2.3 dist.attestations
```

In a project that depends on `v-network-graph`, verify the registry signatures and provenance
attestations of the installed packages:

```sh
npm audit signatures
```

The package page on npmjs.com also shows the provenance, with links to the source commit and the
workflow run.
