# Security Policy

## Supported Versions

Only the version on the `latest` dist-tag of [npm](https://www.npmjs.com/package/v-network-graph)
gets security fixes. A fix ships in a new release, not as a backport to older ones. Prereleases,
published under the `next` dist-tag, are not supported.

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Use [GitHub Security Advisories](https://github.com/dash14/v-network-graph/security/advisories/new)
to report vulnerabilities privately:

1. Go to the **Security** tab of this repository
2. Click **Report a vulnerability**
3. Fill in the details and submit

### What to include

- Description of the vulnerability and its impact
- Steps to reproduce, ideally with the nodes, edges and configs that trigger it
- Proof of concept, if possible
- Affected versions of v-network-graph and Vue

### Scope

Reports about the library itself are welcome, for example a way for graph data or configs to run
script in the page, and about the published npm package and the workflows that build and release
it.

Vulnerabilities in Vue or other dependencies belong to those projects. So does content that an
application renders in its own slots.

## Response Timeline

This project is maintained by a single developer. Realistic timelines:

- **Acknowledgment**: within 1 week
- **Validation**: a few days to 2 weeks, depending on complexity
- **Fix release**: varies by severity and complexity; critical issues are prioritized

I'll credit reporters in the security advisory unless they prefer to remain anonymous.

## Verifying Releases

Releases are published to npm from GitHub Actions with npm Trusted Publishing, so the release
workflow uses no stored npm token. Each version from 0.10.0 on carries a provenance attestation
that links it to the source commit and the workflow run that built it. See
[Verifying a release](./RELEASING.md#verifying-a-release) for how to check it.

## Dependency Management

- What CI and the releases build with is pinned: npm packages via `pnpm-lock.yaml`, and GitHub
  Actions by commit SHA with a version comment. The published package itself declares version
  ranges, which an application's own lockfile resolves.
- pnpm installs only versions published at least two weeks earlier, except for
  `@dash14/svg-pan-zoom`, this project's own fork, which is released from its own reviewed
  workflow. It also refuses a version that carries weaker publishing evidence than the ones
  before it.
- [Renovate](https://docs.renovatebot.com/) opens dependency and GitHub Actions update pull
  requests, and each goes through CI before merging.
- [OSV-Scanner](https://github.com/google/osv-scanner) scans the lockfile weekly and whenever it
  changes on `main`, and CodeQL analyzes the code. Both report into this repository's Security
  tab.
