# Releasing

Releases are published to npm by the `Release` workflow in GitHub Actions, never from a local
machine. It stages the package with npm Trusted Publishing, so no npm token is stored anywhere,
and npm attaches a provenance attestation that links the package to the workflow run that built
it. The trusted publisher is allowed to stage only, so nothing goes live until a maintainer
approves it on npm with 2FA.

## Steps

1. Bump `version` in `package.json` through a pull request and merge it into `main`.
2. Run the `Release` workflow from `main` (Actions > Release > Run workflow), giving the version
   as a tag, for example `v1.2.3` or `v1.2.3-beta.1`.
3. The workflow checks the tag, then builds and tests the package. Approve the deployment to the
   `release` environment if it asks.
4. The workflow creates a draft GitHub Release with generated notes, then stages the package on
   npm.
5. Approve the staged version within 30 minutes, either on npmjs.com or with
   `npm stage list v-network-graph` and `npm stage approve <stage-id>`.
6. Once the version is on npm, the workflow publishes the release, which creates the tag.

If the run fails or is cancelled before the version is staged, the draft is deleted. After that,
the draft is kept: publish it by hand once the version is approved, or delete it if the version
is rejected with `npm stage reject <stage-id>`.

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
